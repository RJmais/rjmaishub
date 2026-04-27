# RJ+ Hub — Brand Reference (App de Cliente)

**Versão de verdade:** CLAUDE.md atualizado em 14/04/2026.
**O skill `rjmais-brand` (legado) está desatualizado** — fontes e paleta divergem. Esta é a referência oficial para o `app.rjmais.com`.

---

## Paleta oficial RJ+

| Token | HEX | Uso |
|-------|-----|-----|
| `--rj-green-primary` | `#3D4B2E` | Verde musgo — primário, brand, botões padrão |
| `--rj-green-dark` | `#2A3820` | Verde floresta — headers, navbar, dark sections |
| `--rj-beige-bg` | `#EEE8DC` | Bege papel — fundo de página |
| `--rj-beige-accent` | `#CDB98B` | Bege accent — surfaces secundárias, dividers |
| `--rj-gold` | `#B8923E` | Dourado — CTAs principais, highlights, links |
| `--rj-near-black` | `#1D1D1D` | Texto corpo |
| `--rj-white` | `#FFFFFF` | Texto sobre dark, surfaces clean |

**Regras:**
- Nunca usar navy/azul como primário.
- Nunca substituir verde por azul "porque combina".
- Logo branco em fundo escuro. Logo escuro em fundo bege.

---

## Tipografia oficial

| Família | Uso |
|---------|-----|
| **Fahwang** | Títulos, display, hero, números de destaque |
| **Verdana** | Corpo, UI, labels, microcopy |

**NÃO usar:** Cormorant Garamond, Jost, Inter, ou qualquer outra fonte. Confirmado pela Diretora em 05/04/2026.

Fallback web-safe se Fahwang não carregar:
```css
font-family: "Fahwang", "Trajan Pro", Georgia, serif;
```

---

## Logo

- Versão branca: `https://chat.rjpeoplecare.com/rjplus-logo-white.png` (oficial, hospedado no chatbot Sofia).
- Sempre em fundo escuro (verde-floresta `#2A3820` ou near-black `#1D1D1D`).
- Para fundos bege, pedir versão escura ao designer ou usar SVG colorido com `--rj-green-dark`.

---

## Tom de voz

- Calmo, sofisticado, confiável (concierge 5★ que entende de finanças).
- Nunca apressado. Nunca genérico. Nunca salesy.
- Filosofia: **"Luxury is Security"**.
- Idioma padrão do app: **português brasileiro**. Submarcas People Care e Experience têm versões em inglês.

---

## Divisões RJ+ (para uso em UI/menus)

1. RJ+ Investimentos (assessoria principal)
2. RJ+ Internacional (USD/EUR, banking global)
3. RJ+ Empresas (corporate finance, M&A)
4. RJ+ Crédito (com garantia de ativos, consórcio, imobiliário)
5. RJ+ Seguros (vida, saúde, patrimônio)
6. RJ+ Real Estate (FIIs, CRI, curadoria imobiliária)
7. RJ+ Câmbio (remessas, hedge corporativo)
8. RJ+ People Care (concierge premium para estrangeiros) — Sofia mora aqui
9. RJ+ Experience (eventos VIP, Calendário Experience)
10. RJ+ News (revista digital semanal)

---

## Contatos

| Divisão | Email | WhatsApp |
|---------|-------|----------|
| Investimentos (Ana) | relacionamento@rjmais.com | +55 21 98225-9446 |
| People Care (Sofia) | contact@rjpeoplecare.com.br | +55 21 98205-5883 |
| Experience | relacionamento@rjmais.com | +55 21 98225-9446 |

---

## Infra técnica reaproveitável

- **Cloudflare Account ID:** `c88d8f1a5a7013b48d74322eb2b5794f`
- **HubSpot Portal:** `50698885`
- **Modelo Anthropic em uso pelos chatbots:** `claude-sonnet-4-20250514`
- **Sofia hoje:** `https://chat.rjpeoplecare.com` (Cloudflare Pages `sofia-rjplus`, `_worker.js` pattern)
- **Ana hoje:** `https://ana-rjmais.pages.dev` (Cloudflare Pages `ana-rjmais`, `_worker.js` pattern)
- **Calendário:** `https://calendariorjmais.pages.dev`
- **Site institucional:** `https://www.rjmais.com`
