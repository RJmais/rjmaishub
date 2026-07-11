# rjmaishub — RJ+ Internal Tools Monorepo
*Arquivo CLAUDE.md — lido pelo Claude Code no início de cada sessão*
*Última atualização: 11/07/2026*

---

## 🏗️ Stack Técnica

- **Runtime:** Cloudflare Workers (framework: Hono)
- **ORM:** Drizzle ORM
- **Banco de dados:** Supabase Postgres
- **Deploy:** GitHub push → GitHub Actions → Cloudflare Pages (web) + Workers (API). Também: `wrangler deploy` direto.
- **Linguagem:** TypeScript (strict mode, monorepo com npm workspaces)
- **Repositório:** https://github.com/RJmais/rjmaishub (canônico, confirmado 04/07/2026 — NÃO usar as URLs antigas `RJmais/rjmais-internal-tools` e `pilarmoret/rjmais-internal-tools`)

---

## 📁 Estrutura do Projeto

```
rjmaishub/
├── src/
│   ├── web/           # Frontend (Cloudflare Pages) — workspace
│   ├── api/           # API Hono + Drizzle (Cloudflare Worker) — workspace
│   └── shared/        # Código compartilhado entre web e api
├── migrations/        # Migrações do banco
├── dashboard/         # Dashboard
├── outputs/           # Saídas geradas
└── package.json       # Raiz do monorepo (npm workspaces + npm-run-all)
```

---

## ⚙️ Comandos Importantes

```bash
npm run dev              # Dev local (web + api em paralelo)
npm run build            # Build de produção (web + api)
npm run lint             # Lint (web + api)
npm run test             # Testes (web + api)
npm run deploy           # Deploy direto (web + api)
npm run db:migrate:local # Migrações no banco local
npm run db:migrate:prod  # Migrações no banco de produção
git push origin main     # Deploy automático via GitHub Actions (Cloudflare)
```
Variantes por workspace: sufixo `:web` ou `:api` (ex.: `npm run build:api`).

---

## 📏 Regras de Código

1. **TypeScript strict** — NUNCA usar `any` ou `@ts-ignore`
2. **Importações absolutas** com `@/*` (configurado no tsconfig com baseUrl)
3. **Commits em inglês** seguindo Conventional Commits:
   - `feat:` nova funcionalidade
   - `fix:` correção de bug
   - `chore:` manutenção, config
   - `refactor:` refatoração sem mudança de comportamento
4. **Verificar build local** antes de fazer push para evitar falha no CI (GitHub Actions / Cloudflare)
5. **Nunca expor** variáveis de ambiente no código
6. **Sempre usar** `import` ES modules — nunca `require()`

---

## ⚠️ Problemas Conhecidos e Soluções

### Erro "@/* module not found" no build
- **Causa:** `baseUrl` ausente ou incorreto no tsconfig.json
- **Fix aplicado:** `"baseUrl": "."` e `"paths": {"@/*": ["src/*"]}` no tsconfig
- **Status:** ✅ Resolvido em 05/05/2026

### URLs antigas do repositório
- Atualizar qualquer script que ainda use as URLs antigas (ver Stack Técnica acima); remote `origin` verificado 11/07/2026

---

## 🔗 Links de Referência

- Cloudflare Dashboard: https://dash.cloudflare.com
- Supabase Dashboard: https://app.supabase.com

---

## 👤 Contexto da Organização

- Contexto de marcas, sites ativos e contas (Cloudflare/HubSpot): fonte única na memória global `~/.claude/CLAUDE.md` (carregada em toda sessão). Não duplicar aqui.

---

## 🚫 Nunca Fazer

- Fazer push sem testar localmente primeiro
- Alterar o tsconfig sem verificar os paths
- Expor secrets ou API keys no código
- Usar `any` no TypeScript
- Fazer deploy com build falhando
