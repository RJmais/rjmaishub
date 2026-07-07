# rjmaishub — RJ+ Internal Tools Monorepo
*Arquivo AGENTS.md — lido pelo Codex no início de cada sessão*
*Última atualização: Maio 2026*

---

## 🏗️ Stack Técnica

- **Runtime:** Cloudflare Workers (framework: Hono)
- **ORM:** Drizzle ORM
- **Banco de dados:** Supabase Postgres
- **Deploy:** GitHub push → GitHub Actions → Cloudflare Pages (web) + Workers (API). Também: `wrangler deploy` direto.
- **Linguagem:** TypeScript (strict mode, monorepo)
- **Repositório:** https://github.com/pilarmoret/rjmais-internal-tools
- **Account Cloudflare:** c88d8f1a5a7013b48d74322eb2b5794f

---

## 📁 Estrutura do Projeto

```
rjmaishub/
├── src/
│   ├── routes/        # Endpoints Hono
│   ├── db/            # Schema e queries Drizzle
│   └── index.ts       # Entry point do Worker
├── drizzle/           # Migrações do banco
├── wrangler.toml      # Config do Cloudflare Worker
├── tsconfig.json      # TypeScript com paths @/*
└── package.json
```

---

## ⚙️ Comandos Importantes

```bash
npm run dev            # Desenvolvimento local (wrangler dev)
npm run build          # Build de produção
npm run db:push        # Push do schema Drizzle para Supabase
npm run db:studio      # Interface visual do banco
git push origin main   # Deploy automático via GitHub Actions (Cloudflare)
wrangler deploy        # Deploy direto no Cloudflare
```

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

### Repositório migrado
- **URL antiga:** https://github.com/RJmais/rjmais-internal-tools.git
- **URL nova:** https://github.com/pilarmoret/rjmais-internal-tools.git
- Atualizar qualquer script que use a URL antiga

---

## 🔗 Links de Referência

- Cloudflare Dashboard: https://dash.cloudflare.com
- Supabase Dashboard: https://app.supabase.com
- GitHub Repo: https://github.com/pilarmoret/rjmais-internal-tools

---

## 👤 Contexto da Organização

- **Projeto:** RJ+ Assessoria de Investimentos
- **Owner:** Pilar Moretzsohn (pilarmoret@gmail.com)
- **Stack adicional:** Cloudflare Pages para sites estáticos (shield-hq, calendariorjmais, ana-rjmais, etc.)

---

## 🚫 Nunca Fazer

- Fazer push sem testar localmente primeiro
- Alterar o tsconfig sem verificar os paths
- Expor secrets ou API keys no código
- Usar `any` no TypeScript
- Fazer deploy com build falhando
