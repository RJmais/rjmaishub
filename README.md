# RJ+ Hub

App de cliente da **RJ+ Assessoria de Investimentos**.
Mobile + desktop · PWA · Cloudflare Pages + Workers · React + Hono + D1 + KV + R2 · Better-Auth + Turnstile.

> 📌 Antes de mexer em qualquer coisa: leia [`BRAND.md`](./BRAND.md) — paleta, fontes e tom de voz oficiais.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 · Vite 5 · TailwindCSS 3 · shadcn/ui |
| API | Cloudflare Workers · Hono 4 |
| DB | Cloudflare D1 (SQLite at edge) |
| Cache/sessão | Cloudflare KV |
| Storage | Cloudflare R2 |
| Auth | Better-Auth + JWT httpOnly cookies + 2FA opcional |
| Bot protection | Cloudflare Turnstile |
| PWA | vite-plugin-pwa |
| Monitoring | Cloudflare Analytics + Sentry |

---

## Estrutura

```
rjmais-hub/
├── BRAND.md                       # Paleta + tipografia oficial RJ+
├── package.json                   # npm workspaces
├── migrations/                    # D1 SQL migrations
├── src/
│   ├── web/                       # Frontend Vite/React
│   │   ├── public/                # manifest.webmanifest, icons, fonts
│   │   ├── src/
│   │   │   ├── components/        # Header, Footer, ChatRoom
│   │   │   ├── pages/             # Login, Dashboard, SofiaChat, AnaChat...
│   │   │   ├── lib/api.ts         # fetch wrapper + SSE stream
│   │   │   └── styles/            # tokens.css + globals.css
│   │   ├── tailwind.config.ts     # paleta RJ+ como tokens
│   │   └── vite.config.ts
│   ├── api/                       # Cloudflare Worker (Hono)
│   │   ├── src/
│   │   │   ├── index.ts           # entrada Hono + middlewares
│   │   │   ├── middleware/        # security, auth, rateLimit
│   │   │   └── routes/            # health, auth, chat (Sofia/Ana)
│   │   └── wrangler.toml
│   └── shared/types/              # tipos compartilhados
└── .github/workflows/deploy.yml   # CI/CD
```

---

## Desenvolvimento local

```bash
npm install
cp src/api/.dev.vars.example src/api/.dev.vars   # preencher secrets
npm run dev                                      # web + worker em paralelo
```

- Web: http://localhost:5173
- API: http://localhost:8787

### Banco de dados (local)

```bash
npm run db:migrate:local
```

---

## Deploy

```bash
npm run build
npm run deploy
```

Domínio produção: **app.rjmais.com** · API: **api.rjmais.com**.

GitHub Actions já configurado em `.github/workflows/deploy.yml` —
push em `main` → produção · push em `develop` → staging.

### Secrets necessários no GitHub

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID` (= `c88d8f1a5a7013b48d74322eb2b5794f`)

### Secrets do Worker (configurar via `wrangler secret put`)

- `ANTHROPIC_API_KEY` — para Sofia + Ana streaming
- `BETTER_AUTH_SECRET` — gerar com `openssl rand -base64 32`
- `TURNSTILE_SECRET` — Cloudflare Turnstile
- `RESEND_API_KEY` — emails transacionais
- `HUBSPOT_TOKEN` — sincronização de leads (portal `50698885`)

---

## Documentação relacionada

- [`../audit-rjmais-hub-atual.md`](../audit-rjmais-hub-atual.md) — auditoria do protótipo CSB
- [`../rjmais-hub-spec-tecnica.md`](../rjmais-hub-spec-tecnica.md) — spec arquitetural completa
- [`../rjmais-hub-implementation-guide.md`](../rjmais-hub-implementation-guide.md) — patterns de código + snippets
- [`../rjmais-hub-quality-review.md`](../rjmais-hub-quality-review.md) — gaps LGPD + WCAG + segurança

---

## Status

- ✅ Fase 1 (Auditoria + Spec + Scaffold) — concluída
- 🚧 Fase 2 (Auth real + UX completa + chat persistente) — próxima
- ⏭ Fase 3 (Hardening LGPD + WCAG audit + monitoring) — antes do GA
- ⏭ Fase 4 (Deploy produção + DNS app.rjmais.com)
- 🔄 Fase 5 (Melhoria contínua, feature flags, A/B test)

