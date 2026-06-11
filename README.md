# The BB's Box — Automação de Growth Orgânico

Base independente da loja **The BB's Box** (thebbsbox.com): rotina automática de
marketing orgânico 2x por dia + painel visual de acompanhamento.

## O que tem aqui

| Pasta/arquivo | Função |
|---|---|
| `.github/workflows/growth-routine.yml` | Rotina de growth — roda sozinha às 09:00 e 21:00 (Brasília) |
| `.github/workflows/pages.yml` | Publica o painel no GitHub Pages |
| `dashboard/` | Painel visual (status, histórico, relatórios, botão de disparo) |
| `outputs/social-engagement-*/` | Pacote de conteúdo usado pela rotina |
| `outputs/reports/` | Relatórios gerados automaticamente a cada execução |

## Setup (uma única vez)

1. **Instalar o app Claude** neste repositório: https://github.com/apps/claude
   → Configure → conta `pilarmoret` → marcar o repositório `bbsbox`.
2. **Criar o secret da API:** Settings → Secrets and variables → Actions →
   New repository secret → Name: `ANTHROPIC_API_KEY` → Value: chave criada em
   https://console.anthropic.com (precisa ter créditos; custo ≈ US$ 0,90/execução).
3. **Publicar o painel:** aba Actions → "Deploy dashboard (GitHub Pages)" →
   Run workflow. O painel fica em: **https://pilarmoret.github.io/bbsbox/**

## Uso diário

- A rotina roda sozinha 2x/dia — nenhuma ação necessária.
- Acompanhe tudo pelo painel: https://pilarmoret.github.io/bbsbox/
- Para rodar fora de hora: botão "▶ Rodar agora" no painel (abre a página do
  GitHub; clique em "Run workflow").
