# Relatório — Progresso da Migração CJ (run manual, 12/jun/2026 ~23:30 UTC)
**Status:** ✅ COM MUDANÇAS

## O que aconteceu desde o relatório das 20:50
A dona conectou produtos no app CJ; validei tudo na loja via API e atualizei tags e planilha.

### Migração CJ — placar ao vivo
- **CONCLUÍDOS: 8 produtos** (6 nesta leva + Blazer Dress e Boho Maxi antes). Tags trocadas
  `migrate-to-cj` → `cj-connected`. Margens validadas com o custo real da CJ: **80–92%**,
  todas acima do piso de 55% — nenhum preço precisou de ajuste.
  Destaque: **Chic Elise Midi Dress (nº 1 em vendas) está migrado** (margem 90%).
- **PARCIAIS: 5** (mantêm as duas tags) — variantes faltantes documentadas na planilha
  (anexo-2026-06-12-cj-sourcing-fila.md, bloco STATUS no topo).
- **PENDENTES: 25** — incluindo Pointy News Heels e Anti-theft Bag (topo da fila por vendas).

### Outras ações do run
- Collection **"Inverno Elegante BR — Entrega 2–3 Dias"** criada (smart, tag `cj-br`,
  handle inverno-elegante-br-entrega-2-3-dias) — se preenche conforme a dona confirma
  Ship From BR no app.
- Planilha de sourcing atualizada com coluna de status + observações por produto.
- Fotos: conexão CJ NÃO troca imagens (verificado: Chic Elise segue 664px). Caminho
  acordado: dona envia os links dos produtos CJ conectados → trocamos as fotos em alta via API.

### Aguardando da dona (bloqueia o quê)
1. Lista "quais ficaram Ship From BR" → tag `cj-br` + collection BR ganha produtos.
2. Links dos produtos CJ conectados → fotos em alta nos 3 `needs-photo-refresh` já migrados.
3. Conectar os 25 pendentes + variantes dos 5 parciais (planilha, ~2 min cada).
