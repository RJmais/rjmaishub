# Relatório — Memória Permanente v2.0 + Automação Diária (13/jun ~17:30 UTC)
**Status:** ✅ COM MUDANÇAS

## Pedido
"Analise toda a conversa dos últimos 2 dias, salve todas as novas regras/padrões/
direcionamentos na memória permanente e mantenha como padrão. Sugira uma automação diária
para a loja se manter atualizada e viva."

## 1. Memória permanente consolidada → `outputs/MEMORY.md` (v2.0)
Reescrevi a memória como documento canônico **versionado no repositório** (permanente, não
mais só um arquivo solto). Estrutura nova:
- **PARTE A — Diretrizes Permanentes** (valem sempre): fatos da loja · posicionamento ·
  padrões de catálogo (piso de preço, títulos, descrições, productType, imagens, limpeza de
  import novo, esgotados, cauda longa) · marketing orgânico · regras do The Edit · idioma &
  tradução (EN primário → PT no BR) · fornecedores & honestidade de prazo · limites de tema ·
  ética/guardrails · ritmo operacional (relatório sempre, fluxo PR/CI/merge, lotes via subagente).
- **PARTE B — Estado atual & backlog** (muda a cada run): coleções, migração CJ, tradução,
  pendências de tema, tags ativas, backlog, imagens do blog já usadas, últimas mudanças.

Todas as regras que descobrimos/decidimos nos 2 dias estão codificadas lá como padrão.

## 2. Automação diária → `daily-store-keeper.yml` (template pronto)
Hoje existe o `growth-routine.yml` (só conteúdo, 2x/dia, e proibido mexer em preço/estoque).
Para "manter a loja viva" de verdade, desenhei o **Store-Keeper diário** que consolida e
amplia: além do conteúdo, faz a **higiene de catálogo** que viemos fazendo na mão.

Passos do run diário: 1) diagnóstico/snapshot → 2) higiene de catálogo (limpar imports novos,
piso de preço, esgotados→draft, fotos) → 3) revalidar tags CJ/fornecedor → 4) integridade de
vitrine (home/New Arrivals/coleções) → 5) conteúdo orgânico (IG/TikTok/The Edit/GBP) →
6) tradução → 7) relatório + atualizar memória. Guardrails inegociáveis embutidos (sem pago,
nada apagado, cortes reversíveis, não enganar cliente, ambíguo → vira pendência da dona).

**Para ativar (setup único):** mover `daily-store-keeper.yml` para `.github/workflows/`,
configurar o secret `ANTHROPIC_API_KEY` e a **conexão MCP da Shopify** no ambiente do Action
(mesmas credenciais desta sessão). Aí ele roda sozinho todo dia às 10:00 BRT (e 21:00 p/
conteúdo). Pode rodar manual via "Run workflow" a qualquer momento.

> Não ativei o cron sozinho (é uma automação outward-facing): deixei como template, como o
> growth-routine.yml já era. É só me dizer "ativa o store-keeper" que eu movo para
> `.github/workflows/` e aposento o antigo.

## Recomendação
Adotar o Store-Keeper diário e aposentar o `growth-routine.yml` (o novo inclui o conteúdo do
antigo + higiene). Cadência sugerida: 1 passada completa de manhã (manutenção+conteúdo) e,
se quiser, 1 passada só de conteúdo à noite.
