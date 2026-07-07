# 🔐 Security Audit — rjmaishub (RJ+ Hub)

- **Data:** 2026-07-06
- **Auditor:** Claude Code (senior appsec review, read-only)
- **Escopo:** Worker Hono (`src/api`), SPA React (`src/web`), schema/migrations Drizzle, `wrangler.toml`, config de deploy.
- **Contexto confirmado pela Diretora:** app **público / em produção**, dados PII sob LGPD (assessoria de investimentos).

---

## 1. Arquitetura & superfície de ataque

- **Runtime:** Cloudflare Worker (Hono 4), Postgres via `postgres-js` + Drizzle (conexão direta `DATABASE_URL`, Supabase pooler). Sessão + rate-limit em Workers KV.
- **Auth:** cookie de sessão (`rj_session`, httpOnly/Secure/SameSite=Strict), senhas PBKDF2, TOTP 2FA opcional, Turnstile em signup/login/forgot.
- **Entradas públicas:** `/health`, `/auth/*`, `/webhooks/ana-lead`, `/webhooks/sofia-lead`.
- **Autenticadas:** `/chat` (stream Anthropic), `/leads` (admin), `/consents`, `/data` (LGPD), `/dpo`, `/referrals`, `/events`.
- **Chamadas externas de saída:** Anthropic, Resend, HubSpot, Turnstile.
- **Segredos:** todos via `wrangler secret` — nenhum commitado (verificado). `.dev.vars` gitignored.

**Pontos já bons:** queries parametrizadas (sem superfície SQLi), CSP + HSTS + frame-deny fortes, comparações timing-safe, anti-enumeração em signup/login/forgot, tempToken de 2FA vinculado a IP, sem `dangerouslySetInnerHTML`/`eval` na SPA, checagem de tier admin em `/leads`, escopo por `userId` em todas as rotas (nenhum IDOR encontrado).

---

## 2. Achados por severidade

### 🔴 HIGH

**H1 — Webhooks de lead sem autenticação nem verificação de assinatura**
`src/api/src/routes/webhooks/anaLead.ts:29`, `sofiaLead.ts:29`
Aceitam qualquer POST JSON (só rate-limit por IP, 10/min). Qualquer um injeta leads falsos gravados no DB **e empurrados pro HubSpot**. Impacto: poluição do CRM, spam, consumo de quota HubSpot, crescimento ilimitado da tabela. Rotação de IP derrota o rate-limit.
**Fix:** exigir assinatura HMAC (segredo compartilhado com os chatbots Ana/Sofia) e verificar em tempo constante antes de processar.

**H2 — Segredos TOTP armazenados em texto puro (comentário do schema mente)**
`src/api/src/routes/auth.ts:553` grava `totpSecret` cru; o pendente fica em KV em texto puro (`auth.ts:535`); `migrations/0001_init.sql:14` diz `-- criptografado` mas nada criptografa. Existem helpers `encryptAES256GCM`/`decryptAES256GCM` em `crypto.ts` **não usados**, e **não há env var de chave**. Vazamento de DB/KV → semente 2FA de todos os usuários → bypass total de 2FA. Backup codes estão corretamente hasheados.
**Fix:** adicionar `TOTP_ENC_KEY`, criptografar na escrita e descriptografar na verificação. Criptografar também o pendente em KV.

**H3 — Sem throttling na verificação do código 2FA**
`src/api/src/routes/auth.ts:336` (`/login/2fa`)
Com a senha (→ `tempToken` válido, TTL 300s), **não há limite de tentativas** no palpite TOTP. Com janela ±1, ~3 códigos válidos a cada momento em 10⁶; script rápido tem probabilidade real dentro da janela. `/login` tem rate-limit por IP, `/login/2fa` não.
**Fix:** contador em KV por `tempToken` (máx 5 tentativas → queima o token) + limite por IP na rota.

### 🟠 MEDIUM

**M1 — Injeção de HTML em emails de saída**
`src/api/src/routes/dpo.ts:61` interpola `body.subject`, `user.name`, `user.email`, `ip` **sem escapar** (só `body.message` é escapado). `src/api/src/routes/referrals.ts:60-64` interpola `user.name` e `body.message` sem escapar. `name` é controlável via `/data/correct`. Usuário autenticado forja HTML/links enviados de `no-reply@rjmais.com`. Impacto: phishing herdando a confiança do domínio.
**Fix:** passar todo valor do usuário por `escapeHtml()` (já exportado de `lib/email.ts`).

**M2 — Endpoint de referral é relay de email aberto**
`src/api/src/routes/referrals.ts:27` envia pra `inviteeEmail` arbitrário sem rate-limit. Com M1, vira canhão de spam/phishing usando seu domínio.
**Fix:** rate-limit por usuário (ex. 5/h, 20/dia) + teto de convites pendentes.

**M3 — Rate limiter não-atômico e eventualmente consistente**
`src/api/src/middleware/rateLimit.ts:15-21` faz read → compara → write em KV (não atômico, consistência eventual global). Rajadas concorrentes ultrapassam o limite, enfraquecendo todo controle anti-brute-force.
**Fix:** para limites críticos, usar Durable Object (atômico) ou o binding nativo de Rate Limiting da Cloudflare; KV só pra limites soft.

**M4 — Iterações PBKDF2 abaixo da recomendação atual**
`src/api/src/lib/crypto.ts:8` usa 100.000 iterações PBKDF2-SHA256. OWASP recomenda 600.000.
**Fix:** subir pra ≥600k (as iterações já vão no hash, então hashes antigos continuam válidos e são atualizados no próximo login).

**M5 — Sem RLS no banco; isolamento só na aplicação**
Nenhum `ROW LEVEL SECURITY`/`POLICY` nas migrations; o Worker conecta com string privilegiada. Um `where(eq(..., userId))` esquecido no futuro = vazamento entre usuários; `DATABASE_URL` vazado = exposição total.
**Fix (defesa em profundidade):** habilitar RLS nas tabelas de usuário e, quando viável, `SET LOCAL app.user_id` por request com políticas de backstop.

**M6 — Bypass de Turnstile não isolado por ambiente**
`src/api/src/lib/turnstile.ts:20-24` retorna `true` quando `secret.startsWith("1x")`. Atalho de teste em caminho de produção; segredo mal configurado desliga o CAPTCHA silenciosamente.
**Fix:** condicionar o bypass a `env.ENVIRONMENT !== "production"`.

### 🟡 LOW

- **L1 — Source maps em produção.** `src/web/vite.config.ts` `build.sourcemap: true` publica `*.js.map` no Pages (revela fonte/comentários). Usar `false` ou `"hidden"` em prod.
- **L2 — Token de reset na query string** (`auth.ts:486`, `?token=`) vaza via `Referer`/histórico. Preferir path segment ou POST body.
- **L3 — `http://localhost:5173` fixo no allow-list de CORS** (`index.ts:45`) inclusive em produção. Condicionar a `ENVIRONMENT !== "production"`.
- **L4 — Sessão não vinculada a IP/UA na validação.** Cookie roubado funciona de qualquer lugar. Aceitável, mas considerar sinalizar mudança de UA/IP em ações sensíveis.
- **L5 — `history` do chat é 100% do cliente** (`chat.ts:72`) e reenviado à Anthropic sem reconciliar com o histórico salvo. Baixo impacto; considerar reconstrução server-side.

---

## 3. Roadmap priorizado

1. **H1** — HMAC nos dois webhooks (maior impacto de negócio, trivial de explorar).
2. **H2** — criptografar segredos TOTP em repouso (`TOTP_ENC_KEY`).
3. **H3** — throttle no `/login/2fa` por tempToken + IP.
4. **M1 / M2** — escapar valores em emails; rate-limit em referrals.
5. **M3** — limites de login/webhook em Durable Object ou binding nativo.
6. **M4 / M6 / M5** — PBKDF2 600k; bypass Turnstile só não-prod; planejar RLS.
7. **L1–L5** — source maps off, token fora da query, CORS/localhost gating.

---

## 4. Tooling

Sem config StackHawk/ZAP no repo. Maior valor imediato: `npm audit --production` (ou Dependabot) no GitHub Actions + inventário de `wrangler secret`. Um `stackhawk.yml` contra a superfície do Worker + job de CT contra preview deploy pode ser adicionado sob demanda.

---

## 5. Status de correção

| Achado | Status | Nota |
|--------|--------|------|
| H1 | Patch aplicado (rollout faseado) | Requer `WEBHOOK_SECRET` + assinatura nos chatbots antes de enforcement |
| H2 | Patch aplicado (rollout faseado) | Requer `TOTP_ENC_KEY`; compatível com segredos legados em texto puro |
| H3 | Patch aplicado | Sem dependência externa |
| M1–M6, L1–L5 | Pendente | Aguardando Go |

> Patches HIGH ficam no working tree — **sem deploy**. Sequência segura de rollout documentada no fim deste arquivo / no resumo da sessão.
