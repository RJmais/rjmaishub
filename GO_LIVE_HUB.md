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

# 5. Trocar o secret DATABASE_URL do worker real (rjmaishub-api) pro projeto novo:
npx wrangler secret put DATABASE_URL
# cola a MESMA connection string do passo 2/3 quando pedir o valor.
```

### Opção C — Schema `hub` dentro do projeto compartilhado (custo zero)

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

Esperado: **HTTP 400** com corpo JSON (erro de validação Zod — falta
`email`/`password`/`turnstileToken`).

Se vier **HTML** (o `index.html` do SPA) ou **405** → a ponte não está no ar;
revisar `src/web/functions/api/[[path]].ts`, `src/web/wrangler.toml` (service
binding `API`) e o step de deploy no CI antes de prosseguir pras próximas
fases.

---

## Fase 3 — Turnstile produção

```bash
# 1. Dashboard Cloudflare > Turnstile > Add site.
#    Domínios: rjmaishub.pages.dev + app.rjmais.com (cadastra os dois já,
#    mesmo o segundo não resolvendo em DNS ainda — ver Fase 7).

# 2. Site Key (é PÚBLICA) -> GitHub Actions variable (não secret):
gh variable set VITE_TURNSTILE_SITE_KEY --body "0x4AAAAAAA...." --repo RJmais/rjmaishub

# 3. Secret Key -> wrangler secret no worker:
cd src/api
npx wrangler secret put TURNSTILE_SECRET
# cola o Secret Key real do Turnstile.
```

**⚠️ NUNCA colar um valor começando com `1x` em produção.** `src/api/src/lib/turnstile.ts`
tem um bypass propositalmente pra dev/teste: se `TURNSTILE_SECRET` começar
com `"1x"`, **todo** captcha é aprovado sem checar nada no servidor da
Cloudflare (M6 do backlog de segurança, item ainda aberto — ver seção
Backlog abaixo). Os secrets de teste oficiais do Turnstile começam todos com
`1x`; use o Secret Key real gerado no passo 1.

---

## Fase 4 — Secrets faltantes

```bash
cd src/api

# TOTP_ENC_KEY — criptografa o segredo TOTP em repouso (2FA)
openssl rand -base64 32
npx wrangler secret put TOTP_ENC_KEY
# cola o valor gerado acima

# WEBHOOK_SECRET — HMAC compartilhado com os webhooks de lead dos chatbots
openssl rand -base64 32
npx wrangler secret put WEBHOOK_SECRET
# cola o valor gerado acima
```

Depois de setar `WEBHOOK_SECRET`: **espelhar o MESMO valor** nos workers dos
chatbots Ana e Sofia (repos `RJmais/ana-chatbot` e `RJmais/sofia-chatbot`) —
eles assinam os webhooks de lead com `X-RJ-Signature: sha256=<hex>` usando
esse segredo; se os dois lados não baterem, os webhooks passam a ser
rejeitados (ou aceitos como "não assinado", dependendo do rollout faseado H1
já em produção nesses handlers).

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

# 4. Adicionar app.rjmais.com como domínio adicional no widget Turnstile
#    (Fase 3) — já devia estar cadastrado desde o início, só confirmar.
```

---

## Backlog pós-go-live (fora do escopo deste branch)

- Deletar o worker órfão `rjmaishub-api-production` (criado por engano por
  `--env production` antes da correção do CI) — **ação destrutiva, exige Go
  explícito** antes de rodar `wrangler delete`.
- `ENVIRONMENT` ainda como `"development"` no worker real (`src/api/wrangler.toml`)
  — ajustar pra `"production"` quando o go-live for considerado estável.
- Seção `[env.staging]` inexistente no `wrangler.toml` da API, mas o CI já
  roda `deploy --env staging` no push pra `develop` — hoje isso provavelmente
  falha ou cai num environment implícito; precisa de decisão (criar
  `[env.staging]` de verdade ou simplificar o CI pra não deployar staging).
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
