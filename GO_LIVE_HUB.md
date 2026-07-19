# GO_LIVE_HUB.md — Runbook de execução pós-Go (RJ+ Hub)

> **Nada neste documento foi executado.** É o roteiro de comandos pra colocar a
> área do cliente RJ+ Hub no ar, a partir do branch `claude/hub-golive`.
> Todo passo abaixo tem consequência externa (deploy, secret, produção,
> e-mail real) — por AUTONOMY_POLICY (Nível 0/1) e pela Regra Crítica 8 do
> CLAUDE.md, cada fase exige Go explícito da Diretora antes de rodar. Nenhuma
> fase depende da anterior estar 100% perfeita pra começar a próxima, mas a
> ORDEM abaixo é a que menos gera retrabalho.
>
> Repo: `github.com/RJmais/rjmaishub` (confirmado via `git remote -v` neste
> worktree — a URL antiga `rjmais-internal-tools` que aparece no CLAUDE.md do
> repo está desatualizada).

---

## Conteúdo do branch (o que o merge leva a produção)

O merge de `claude/hub-golive` em `main` leva **todos** os commits abaixo —
não só os desta missão:

| Commit | O quê | Origem |
|---|---|---|
| `a2a2821` | fix: DB client por request (`src/api/src/db/client.ts` — cliente Drizzle criado a cada request, `connect_timeout` 10s, `idle_timeout` 20s) | ⚠️ **Pré-existente**, herdado da base do branch (não é desta missão). Revisão Argus 19/07: conteúdo APROVADO tecnicamente — cliente por-request é o padrão correto em Workers (sockets não sobrevivem entre invocações; pooling real fica no Supavisor). |
| `7ed28e7` | Ponte `/api/*` (Pages Function + `src/web/wrangler.toml` + CI wrangler-action + `APP_URL` provisório) | Esta missão |
| `07ba542` | Remetente `relacionamento@rjmais.com` | Esta missão |
| `e04dcb6` | Este runbook | Esta missão |
| *(seguintes)* | Correções da revisão Argus 19/07 (A1–A8): marcador `X-Hub-Proxy` no proxy, CI só em `main` + `workflow_dispatch`, Verdana nos emails, `FILES?` opcional, runbook revisado | Esta missão (pós-Argus) — ver `git log claude/hub-golive` |

---

## Fase 1 — Banco

### Causa raiz (por que isso é necessário)

A migration `0000_yielding_spencer_smythe.sql` nunca foi aplicada no projeto
Supabase compartilhado (`gkfodtylflcpsqzshrbu`) porque `public.users` **já
existia** nesse projeto com outro formato (uuid, tabela do RJ+ Guide) —
colisão de nomes com o `users` que o schema do Hub (`src/api/src/db/schema.ts`)
espera criar em `public`. As duas opções abaixo existem justamente pra evitar
mexer em `public` do projeto compartilhado.

Escolha UMA das duas opções.

### Opção A — Projeto Supabase dedicado `rjmais-hub` (recomendada)

> **⚠️ Quota do plano free (decisão antes de começar):** a org Supabase
> "Pilars" está no plano **free**, que limita **2 projetos ativos** — e já
> existem 2 (`rjmais-internal` + `rjmais-presenca`). A API de custo retorna
> $0/mês para projeto novo, mas a criação do 3º pode ser **bloqueada por
> quota**. Se bloquear, a decisão sobe pra Diretora: (i) upgrade pro plano
> Pro (pago — decisão financeira, Nível 0), (ii) pausar um dos projetos
> existentes, ou (iii) cair pra Opção C abaixo. Não improvisar: parar e
> perguntar.

```bash
# 1. Criar o projeto no dashboard Supabase (ou via MCP create_project):
#    nome "rjmais-hub", região mais próxima de sa-east-1 disponível no plano.

# 2. Pegar a connection string do POOLER em modo Transaction (porta 6543):
#    Painel do projeto novo > Settings > Database > Connection string >
#    "Transaction pooler". Formato:
#    postgresql://postgres.<ref>:<SENHA_URL_ENCODED>@aws-<regiao>.pooler.supabase.com:6543/postgres
#    Se a senha tiver caracteres especiais (@ # / % etc.), fazer URL-encode
#    ANTES de colar na connection string (senha crua quebra o parse da URL).

cd src/api
export DATABASE_URL="postgresql://postgres.<ref>:<SENHA_ENCODED>@aws-<regiao>.pooler.supabase.com:6543/postgres"

# 3. Aplicar as migrations (drizzle.config.ts já aponta pro schema/out corretos):
npx drizzle-kit migrate
# alternativa sem histórico de migration (aplica o schema direto, útil se
# `migrate` reclamar de estado — CUIDADO, push pode divergir do histórico):
# npx drizzle-kit push

# 4. Copiar dados do projeto compartilhado (gkfodtylflcpsqzshrbu) pro novo:
#    a) painel_incidentes — 6 linhas hoje. Exportar do projeto antigo:
psql "postgresql://postgres.gkfodtylflcpsqzshrbu:<SENHA_ANTIGA>@aws-<regiao>.pooler.supabase.com:6543/postgres" \
  -c "\copy (SELECT * FROM painel_incidentes) TO 'painel_incidentes.csv' CSV HEADER"
#    Importar no projeto novo:
psql "$DATABASE_URL" -c "\copy painel_incidentes FROM 'painel_incidentes.csv' CSV HEADER"

#    b) leads — 0 linhas hoje (confirmar antes: SELECT count(*) FROM leads;
#       no projeto antigo). Se continuar 0, não precisa copiar nada — a
#       migration já cria a tabela vazia no projeto novo.

# 5. OBRIGATÓRIO — fechar a Data API (PostgREST) do projeto novo:
#    Painel do projeto novo > Settings > API > Data API: DESABILITAR
#    (ou, se preferir manter a API ligada, aplicar RLS deny-all em TODAS as
#    tabelas: ALTER TABLE <t> ENABLE ROW LEVEL SECURITY; sem nenhuma policy).
#    Motivo: por default o Supabase expõe o schema `public` via REST atrás da
#    anon key — e essas tabelas guardam hash de senha, segredo TOTP, chat e
#    dados LGPD. O Hub NÃO usa PostgREST (só DATABASE_URL via Drizzle), então
#    desabilitar não quebra nada.

# 6. Trocar o secret DATABASE_URL do worker real (rjmaishub-api) pro projeto novo:
npx wrangler secret put DATABASE_URL
# cola a MESMA connection string do passo 2/3 quando pedir o valor.
```

### Opção C — Schema `hub` dentro do projeto compartilhado (custo zero)

> Vantagem implícita da C: schemas fora de `public` **não são expostos** pelo
> PostgREST por default (o passo "fechar a Data API" da Opção A vira
> desnecessário). Ainda assim a **A segue recomendada**: a C exige refactor
> `pgSchema` + migrations novas + mais um ciclo de revisão, e mantém dados
> sensíveis de cliente no mesmo banco do RH/Guide (blast radius e backup
> acoplados).

```bash
# ⚠️ Esta opção exige um passo de CÓDIGO que NÃO está neste branch
#    (claude/hub-golive) ainda — precisa ser feito à parte, revisado e
#    mergeado antes de rodar o resto desta opção.

# 1. src/api/src/db/schema.ts: envolver as tabelas num pgSchema("hub") em vez
#    de pgTable direto em public. Ex.:
#      import { pgSchema } from 'drizzle-orm/pg-core';
#      const hubSchema = pgSchema('hub');
#      export const users = hubSchema.table('users', { ... });
#    (repetir pra todas as tabelas do arquivo: userProfiles, userConsents,
#    sessions, etc.)

# 2. Regenerar as migrations do zero (o schema mudou de public.* pra hub.*
#    — as migrations atuais em src/api/drizzle/ não servem mais tal como
#    estão, precisam ser re-geradas):
cd src/api
npx drizzle-kit generate

# 3. Aplicar no projeto COMPARTILHADO (gkfodtylflcpsqzshrbu), com
#    search_path apontando pro schema novo (evita colidir com public.users):
export DATABASE_URL="postgresql://postgres.gkfodtylflcpsqzshrbu:<SENHA>@aws-<regiao>.pooler.supabase.com:6543/postgres?options=-csearch_path%3Dhub"
npx drizzle-kit migrate

# 4. Copiar os dados (painel_incidentes 6 linhas + leads 0 linhas) de
#    public.* pra hub.* DENTRO do mesmo banco — não é \copy entre bancos,
#    é INSERT direto:
psql "$DATABASE_URL" -c "INSERT INTO hub.painel_incidentes SELECT * FROM public.painel_incidentes;"

# 5. Trocar o secret DATABASE_URL do worker (mesma troca da Opção A, mas com
#    o ?options=-csearch_path%3Dhub na connection string):
npx wrangler secret put DATABASE_URL
```

---

## Fase 2 — Deploy da ponte

```bash
# Merge do branch claude/hub-golive -> main (PR ou merge direto, como preferir)
git checkout main
git merge claude/hub-golive --no-ff
git push origin main
# CI (.github/workflows/deploy.yml) builda web+worker e deploya Pages +
# Worker automaticamente no push em main.
```

**Critério de sucesso** (a ponte `/api/*` está funcionando):

```bash
curl -i -X POST https://rjmaishub.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{}'
```

Esperado (as DUAS condições, não só a primeira):

1. **HTTP 400** com corpo JSON (erro de validação Zod — falta
   `email`/`password`/`turnstileToken`);
2. header **`X-Hub-Proxy: binding`** na resposta.

Se vier **HTML** (o `index.html` do SPA) ou **405** → a ponte não está no ar;
revisar `src/web/functions/api/[[path]].ts`, `src/web/wrangler.toml` (service
binding `API`) e o step de deploy no CI antes de prosseguir pras próximas
fases.

Se vier `X-Hub-Proxy: fallback` → a ponte "funciona", mas o **service binding
não foi provisionado** — o worker está enxergando o IP de egress da Cloudflare
em vez do IP do cliente, o que **globaliza o rate-limit de auth** (signup 3/h
e login 5/min compartilhados por TODOS os clientes) e polui o audit log.
**Fallback NÃO conta como sucesso da Fase 2.** Conferir no dashboard:
projeto Pages `rjmaishub` > Settings > Bindings > `API → rjmaishub-api`
(provisionado pelo primeiro deploy com o `src/web/wrangler.toml` novo).

---

## Fase 3 — Turnstile produção

> **⚠️ A ORDEM AQUI É CRÍTICA.** O front deployado hoje usa a site key de
> TESTE (fallback hardcoded). Se o Secret Key real for colocado no worker
> **antes** de o front ser rebuildado com a site key real, os tokens de teste
> passam a falhar contra o siteverify real → **signup e login ficam 100%
> bloqueados** até alguém empurrar um novo build. E atenção:
> `gh variable set` **NÃO rebuilda nada sozinho** — o rebuild é o passo 3.

```bash
# 1. Dashboard Cloudflare > Turnstile > Add site.
#    Domínios: rjmaishub.pages.dev + app.rjmais.com (cadastra os dois já,
#    mesmo o segundo não resolvendo em DNS ainda — ver Fase 7).

# 2. Site Key (é PÚBLICA) -> GitHub Actions variable (não secret):
gh variable set VITE_TURNSTILE_SITE_KEY --body "0x4AAAAAAA...." --repo RJmais/rjmaishub

# 3. REBUILDAR o front pra site key real entrar no bundle:
gh workflow run Deploy --repo RJmais/rjmaishub --ref main
#    (workflow_dispatch adicionado neste branch; alternativa: qualquer push
#    em main.)

# 4. CONFIRMAR que a site key real está no ar (não a de teste "1x000...AA"):
curl -s https://rjmaishub.pages.dev | grep -o 'src="/assets/[^"]*\.js"' | head -1
#    baixar o bundle JS indicado e conferir:
#    curl -s https://rjmaishub.pages.dev/assets/<bundle>.js | grep -c "1x00000000000000000000AA"
#    Esperado: 0 ocorrências (a key real substituiu o fallback).

# 5. SÓ ENTÃO: Secret Key -> wrangler secret no worker:
cd src/api
npx wrangler secret put TURNSTILE_SECRET
# cola o Secret Key real do Turnstile.

# 6. Smoke test de signup NA MESMA JANELA (não deixar pra depois):
#    abrir https://rjmaishub.pages.dev/signup, resolver o captcha real e
#    criar uma conta de teste — tem que passar.
```

**⚠️ NUNCA colar um valor começando com `1x` em produção.** `src/api/src/lib/turnstile.ts`
tem um bypass propositalmente pra dev/teste: se `TURNSTILE_SECRET` começar
com `"1x"`, **todo** captcha é aprovado sem checar nada no servidor da
Cloudflare (M6 do backlog de segurança, item ainda aberto — ver seção
Backlog abaixo). Os secrets de teste oficiais do Turnstile começam todos com
`1x`; use o Secret Key real gerado no passo 1.

---

## Fase 4 — Secret faltante: TOTP_ENC_KEY

```bash
cd src/api

# TOTP_ENC_KEY — criptografa o segredo TOTP em repouso (2FA)
openssl rand -base64 32
npx wrangler secret put TOTP_ENC_KEY
# cola o valor gerado acima
```

Seguro de ativar a qualquer momento: `decryptTotpSecret()`
(`src/api/src/lib/crypto.ts`) detecta segredos legados em plaintext pela
ausência de `:` — usuários que já tiverem 2FA não quebram.

> **`WEBHOOK_SECRET` NÃO entra nesta fase.** Foi movido pra Fase 8. No
> código (`src/api/src/routes/webhooks/anaLead.ts` e `sofiaLead.ts`), com o
> secret setado toda requisição sem assinatura válida é **REJEITADA** — e a
> varredura de 19/07 (ver Fase 8) mostrou que os chatbots hoje **nem chamam**
> esses endpoints (lead vai direto ao HubSpot), então setar o secret não
> perde lead nenhum. O que falta é a **decisão da Diretora** na Fase 8 sobre
> a integração; inclusive, como os endpoints estão no ar abertos e sem
> tráfego legítimo, a revisão Argus recomenda considerar setá-lo **já no
> go-live** só pra fechar essa porta (injeção de leads falsos).

---

## Fase 5 — Email

1. Confirmar no painel **Resend** (Domains) que `rjmais.com` está com status
   **Verified** (SPF/DKIM/DMARC propagados).
2. Remetente já ajustado neste branch (commit separado): `RJ+ Hub <relacionamento@rjmais.com>`.
3. Se `RESEND_API_KEY` ainda não estiver setado no worker:
   ```bash
   cd src/api
   npx wrangler secret put RESEND_API_KEY
   ```

Sem `RESEND_API_KEY`, `sendEmail()` (`src/api/src/lib/email.ts`) roda em modo
stub (só loga, não envia) — signup/reset de senha funcionam mas o email
nunca chega, o que quebra o fluxo de verificação da Fase 6.

---

## Fase 6 — E2E (fluxo completo, manual)

1. **Signup** — criar conta em `https://rjmaishub.pages.dev/signup`.
2. **Email chega** — confirmar recebimento do email de verificação
   (remetente `relacionamento@rjmais.com`, link `{APP_URL}/verificar-email/{token}`).
3. **Verify-email** — clicar no link, confirmar que a conta é marcada como
   verificada (`POST /api/auth/verify-email/:token` retorna `{"status":"ok"}`).
4. **Login** — logar com a conta criada.
5. **`GET /api/auth/me`** — confirmar que retorna o JSON do usuário
   autenticado (cookie de sessão `rj_session` sendo enviado corretamente).
6. **Telas**: Início, Sofia, Ana, Experience, News, Configurações — navegar
   por todas, sem erro 401/500 inesperado.
7. **2FA**: `2fa/enable` → escanear QR → `2fa/confirm` com código de 6
   dígitos → logout → login novamente → tela de 2FA → `login/2fa` com novo
   código.
8. **Painel admin** — promover o primeiro usuário admin via SQL manual
   (`UPDATE users SET tier = 'admin' WHERE email = '...';` no banco em uso,
   ver Fase 1) e confirmar acesso às rotas `/painel`.

Qualquer falha num desses passos = **não considerar o go-live concluído**,
mesmo que a Fase 2 tenha passado no critério de sucesso.

---

## Fase 7 — Domínio definitivo (depois)

```bash
# 1. HostGator (zona rjmais.com): criar registro
#    CNAME  app  ->  rjmaishub.pages.dev

# 2. Cloudflare Pages: projeto rjmaishub > Custom domains > Add > app.rjmais.com

# 3. Reverter o APP_URL provisório (src/api/wrangler.toml):
#    APP_URL = "https://app.rjmais.com"
#    (e remover o comentário # TODO associado)
#    ⚠️ Editar o toml sozinho NÃO muda produção — a reversão só tem efeito
#    com COMMIT + PUSH em main (o CI redeploya o worker). Sem isso, os links
#    de email continuam saindo com o domínio antigo.

# 4. Adicionar app.rjmais.com como domínio adicional no widget Turnstile
#    (Fase 3) — já devia estar cadastrado desde o início, só confirmar.
```

---

## Fase 8 — Hardening coordenado: WEBHOOK_SECRET (pós-go-live)

> **📌 Descoberta da varredura 19/07:** os chatbots hoje **NÃO chamam** os
> webhooks do worker. `functions/submit-lead.js` (clones locais de
> `ana-chatbot` e `sofia-chatbot`, último commit 12/07) faz upsert **direto
> no HubSpot** (`api.hubapi.com/crm/v3/objects/contacts`) + notificação por
> email via Resend — zero referência a `rjmaishub` ou `X-RJ-Signature`.
> Consequências: (a) setar `WEBHOOK_SECRET` no worker **não perde lead
> nenhum HOJE** (os endpoints `/webhooks/*-lead` estão sem tráfego — coerente
> com a tabela `leads` ter 0 linhas); (b) o teste E2E do passo 3 abaixo **não
> vai passar** enquanto a integração não existir. Antes desta fase, a
> Diretora decide: os chatbots passam a postar o lead TAMBÉM no Hub (aí
> implementa-se a assinatura nos bots e segue-se a sequência abaixo) ou os
> endpoints `/webhooks/*-lead` do worker ficam dormentes (e aí esta fase
> vira só "setar o secret pra fechar a porta", sem coordenação necessária).
> Conferir os repos remotos antes de decidir — os clones locais podem estar
> atrás do deploy.

Ativar o HMAC dos webhooks de lead **só quando os DOIS lados assinarem** —
sequência obrigatória:

```bash
# 1. VERIFICAR nos repos dos chatbots se o código de assinatura existe e está
#    ativo (procurar por "X-RJ-Signature" / HMAC no código que POSTa o lead
#    pro rjmaishub):
#      RJmais/ana-chatbot   (ana-rjmais.pages.dev)
#      RJmais/sofia-chatbot (chat.rjpeoplecare.com)
#    Se NÃO existir: implementar + deployar nos chatbots ANTES de qualquer
#    secret no worker do Hub.

# 2. Gerar o segredo e setar nos TRÊS lugares NA MESMA JANELA:
openssl rand -base64 32
cd src/api && npx wrangler secret put WEBHOOK_SECRET          # worker do Hub
#    + mesmo valor como secret/env nos deploys de ana-chatbot e sofia-chatbot

# 3. Teste E2E imediato: 1 lead de teste por bot (conversa com a Ana e com a
#    Sofia até disparar captura de lead) e conferir que chegou (tabela leads
#    + HubSpot). Lead rejeitado = reverter o secret do worker na hora
#    (wrangler secret delete WEBHOOK_SECRET) e investigar.
```

**Por que fora do go-live:** com o secret setado no worker, requisição sem
assinatura válida é REJEITADA (confirmado em `anaLead.ts`/`sofiaLead.ts`) —
ativar sem coordenação = perda silenciosa de 100% dos leads Ana/Sofia.

---

## Backlog pós-go-live (fora do escopo deste branch)

- Deletar o worker órfão `rjmaishub-api-production` (criado por engano por
  `--env production` antes da correção do CI) — **ação destrutiva, exige Go
  explícito** antes de rodar `wrangler delete`.
- `ENVIRONMENT` ainda como `"development"` no worker real (`src/api/wrangler.toml`)
  — ajustar pra `"production"` quando o go-live for considerado estável.
- Ambiente de staging real: os deploys de `develop` foram **desligados neste
  branch** (correção A5 da revisão Argus — preview do Pages carregaria o
  service binding de PRODUÇÃO, e o worker rodava `deploy --env staging` sem
  `[env.staging]` no toml). Quando staging fizer falta, criar de verdade:
  worker próprio + banco próprio + bindings próprios + `[env.staging]` no
  wrangler.toml, e só então reativar o deploy de `develop` no CI.
- M4 da auditoria de segurança (`SECURITY_AUDIT — 2026-07-06.md`): PBKDF2 com
  100k iterações, subir pra 600k com re-hash oportunista no login.
- M6 da auditoria: bypass de Turnstile por prefixo `1x` no secret
  (`src/api/src/lib/turnstile.ts`) — hoje é intencional pra dev/teste, mas
  vale considerar restringir por `ENVIRONMENT !== "production"` além do
  prefixo, pra não depender só de "não colar o secret errado".
- `VITE_TURNSTILE_SITE_KEY` ausente no GitHub (Fase 3 não feita ainda) faz o
  build cair suavemente no fallback de teste hardcoded em
  `src/web/src/pages/{Login,Signup,EsqueciSenha}.tsx` — funciona, mas fica
  "mudo" (sem log/alerta) se isso acontecer em produção sem querer.
- Binding R2 `FILES` comentado em `src/api/wrangler.toml` — precisa de bucket
  criado + binding descomentado quando o upload de documentos (extratos,
  contratos, comprovantes) entrar em uso.
- `npm run db:migrate:local` / `db:migrate:prod` (definidos no `package.json`
  da raiz, chamando `--workspace src/api run db:migrate:local`) **não têm
  script correspondente** em `src/api/package.json` (só existe `db:generate`
  e `db:push`) — os comandos desta Fase 1 usam `npx drizzle-kit migrate`
  direto por isso; vale decidir se cria os scripts que faltam ou remove os
  do root.
