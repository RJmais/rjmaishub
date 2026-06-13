# MEMÓRIA PERMANENTE & PLAYBOOK — The BB's Box
*Fonte canônica de regras, padrões e direcionamentos. Versionada no repositório (permanente).*
*Lida no início de CADA execução (manual ou automática). Atualizada ao final de cada run.*
*Consolidada em 2026-06-13 a partir de 2 dias de operação. v2.0*

> Estrutura: **PARTE A = DIRETRIZES PERMANENTES** (valem sempre, mudam raramente).
> **PARTE B = ESTADO ATUAL & BACKLOG** (muda a cada run). Sempre reler a Parte A antes de agir.

---
# PARTE A — DIRETRIZES PERMANENTES (padrão daqui por diante)

## A1. Fatos da loja (estáveis)
- Loja: thebbsbox.com · myshopify: af0150-3.myshopify.com · plano Basic · moeda USD · idioma primário EN, pt-BR publicado.
- Mercado prioritário: **Brasil** (mercados: US primário, Brazil, International).
- 3 universos de marca (tags `world-`): **Maison Doux** 🌸 (romântico/floral) · **The Linen House** 🌾 (linho/neutros) · **VOLTAGE DROP** ⚡ (jeans/paetês/ousado).
- Blogs: "News" (gid 90479263999) · **"The Edit — Fashion Journal"** (gid 105419768063, handle the-edit, 2x/semana seg+qui, edições numeradas).
- Página da fundadora (linkar em TODO The Edit): /pages/the-founder-a-love-letter-to-fashion-vintage-bags
- Links rastreáveis fixos: IG/TikTok bit.ly/43qQJXX · FB bit.ly/4uowANi · GBP bit.ly/4us3tbR
- Locations: "My warehouse" (Toms River/EUA) · "RJ" (Rio/Brasil — ativa mas VAZIA) · location app `cjdropshipping` (gid 91739259135).

## A2. Posicionamento (manda em TUDO)
- **"Tendência acessível e elegante" / attainable luxury.** A BB's Box é **CURADORIA, não catálogo.** Nível médio-alto.
- **Teste obrigatório antes de publicar/exibir qualquer coisa:** "isso poderia parecer um achadinho de Shein?" → se sim, NÃO vai pra vitrine.
- Linguagem: "investment piece", "curated", "edit", "ready-made looks" — NUNCA "cheap/barato/achadinho/promoção relâmpago".

## A3. Padrões de catálogo (hygiene — aplicar sempre, inclusive em produto novo)
1. **PISO DE PREÇO:** vestuário/bolsas/calçados/swim mín. **US$29,97** · bijuteria/acessórios pequenos mín. **US$24,97**. Variante abaixo do piso → subir ao piso. `compareAtPrice` ≤ preço → remover (nunca inventar "de/por").
2. **NUNCA reprecificar vendors Shopify Collective** (preço é do fornecedor; markdowns deles são intencionais).
3. **Títulos:** concisos, Title Case, em inglês (ver A6 idioma), SEM keyword-stuffing, SEM "For Women/Womens Clothing/Fashion Party", SEM marca de fornecedor, SEM sufixo "(One Piece/Set)".
4. **Descrições (padrão da casa):** 2–3 `<p>` curtos (gancho / tecido-caimento / ocasiões) + `<p><em>Styling tip:</em> …</p>` + `<ul>` de 4–5 fatos. **Remover SEMPRE:** imagens hotlinkadas de fornecedor (cjdropshipping.com, alicdn, hzpdex, race321, yesourcing, toprisers…), "Asian sizes", tabelas de medida, "Packing list", "Product information:" cru, spam BUY NOW. Preservar fatos reais (tecido, cores, tamanhos) — nunca inventar material.
5. **productType:** sempre um valor real (Outerwear/Dresses/Tops/Bottoms/Swimwear/Shapewear/Bags & Accessories/Knitwear) — nunca "0"/"4"/"n/a"/numérico.
6. **Vendor:** dropship da casa = "The BB's Box" (normalizar nomes de fornecedor tipo "Adora").
7. **Imagens:** alvo ≥1200px; <800px → tag `needs-photo-refresh`. Fonte de troca: galeria do fornecedor (na conexão CJ) ou sessão própria. NUNCA gerar foto artificial de produto (engana sobre a peça real).
8. **Importação nova entra ATIVA e CRUA** (CJ/dropship) → toda peça nova precisa de limpeza (1–7) ANTES de ficar pronta pro cliente. Verificar a cada run.
9. **Esgotados:** produto ACTIVE com estoque rastreado = 0 (não-POD) → DRAFT + tag `oos-hidden-<aaaa-mm>`; reativar quando o fornecedor repuser (Collective sincroniza estoque mesmo em draft — checar semanalmente). POD sem rastreio fica ativo.
10. **Cauda longa:** itens pré-período sem NENHUMA venda e fora das vitrines → DRAFT + tag `long-tail-cut-<aaaa-mm>` (nunca apagar; vitrines `world-*`/weekly-edit têm prioridade e são poupadas).

## A4. Marketing & conteúdo (orgânico primeiro — SEM mídia paga, JAMAIS)
- Objetivo = alcance/clique orgânico; a venda vem do POSICIONAMENTO. KPIs: views orgânicos, saves/shares, CTR bit.ly, impressões GBP, tráfego do blog.
- Alavancas: (1) gancho nos 2 primeiros segundos do vídeo; (2) conteúdo "salvável" (guias/fórmulas de look); (3) SEO em tudo (long-tail "what to wear to…"/"como usar…"); (4) consistência > volume; (5) comunidade (responder EDIT/DMs, enquetes, UGC).
- **Marketing só destaca peças US$45+.** Itens <US$25 NUNCA aparecem em post/vídeo/blog/GBP.
- **Visual:** modelo, movimento, luz editorial. PROIBIDO: fundo branco de marketplace, colagem de produto, price sticker, "HOT SELL"/"%OFF" no criativo.
- Canais: **Minta** (vídeos auto, só weekly-edit/3 mundos, CTA "Shop the edit"); **IG** (grid 3 mundos, Reels styling, carrosséis, Stories enquete+link; #quietluxury #capsulewardrobe #investmentpieces #modaelegante — proibido #shein/#achadinhos); **TikTok** (styling/qualidade, vintage bag corner, POV elegante; nunca "haul barato"); **GBP** (tom boutique, keywords "elegant women's fashion/curated boutique/moda feminina elegante" — nunca "cheap/desconto").
- Âncoras de credibilidade: os 3 mundos · Style Quiz · The Edit · a fundadora (bolsas vintage/luxo).

## A5. The Edit (regras editoriais — todo post)
- 2x/semana (seg+thu), edições numeradas. Colunas fixas: 📈 Trending Now · 🪡 From the Runway · 💡 Style Ideas · 👜 Vintage Bag Corner. Linkar a página da fundadora.
- TODO artigo tem ≥1 imagem (featured), alt "… — The Edit, Edition #NNN | The BB's Box".
- Imagem = foto de produto da própria loja, condizente com o tema. **NUNCA repetir imagem** entre posts (ver lista em B).
- Antes de criar artigo, conferir se já há um AGENDADO (não duplicar).

## A6. Idioma & tradução (padrão)
- **Conteúdo primário em INGLÊS** (heros, banners, descrições, títulos) → **traduzir para pt-BR** para o visitante do Brasil.
- pt-BR já publicado. Mecanismo correto: app **"Translate & Adapt"** (auto EN→pt-BR, catálogo + futuros) + **Markets→Brazil idioma pt-BR** + **Shopify Geolocation** (servir PT automático). Cobertura via Admin API: `translationsRegister` para peças-herói quando preciso de cobertura imediata.
- Ao criar/editar copy de vitrine, escrever em inglês como base (deixar a tradução PT para o mecanismo).

## A7. Fornecedores & fulfillment (estratégia + honestidade de prazo)
- **Honestidade de prazo é inegociável:** nunca prometer ao cliente um prazo que o fulfillment não cumpre.
  - Zendrop China→BR = 20–45 dias (NÃO usar pra promessa de rapidez).
  - CJ sem armazém BR = importação, ~10 dias (NÃO chamar de "local" nem "2–3 dias" nem "sem taxa"; MP 1.357/2026 isenta só ≤US$50, ICMS ~17–20% segue).
  - CJ armazém BR / fornecedor nacional = 2–3 dias local (o ideal — ainda a buscar).
- **Tags de fornecedor:** `migrate-to-cj` (a re-sourcing, ainda Zendrop) → `cj-connected` (conectado ao CJ, validar estoque+margem) → `cj-br` (entrega rápida BR, entra na coleção de inverno). Só coleção de prazo curto recebe peças realmente conectadas (nunca `migrate-to-cj` não-conectada).
- **Margem mínima 55%** ao reprecificar por custo de fornecedor.
- **Nacionais (inverno elegante):** âncora = TRICÔ (Monte Sião/MG, Nova Friburgo/RJ): Patena (s/ CNPJ), Monte Sião Tricot, Vera, Camila Ribeiro, Loja do Tricô. Alfaiataria: Atacado Principessa, Bella Dama, ÄLLIE, Use Criativa. Automação Shopify: **Dropify** ou **EPROLO**. Brief: outputs/reports/fornecedores-inverno-br-2026-06-13.md.
- **Regra de saúde de app:** app sem estoque na sua location = morto. Pixels/Gearbubble (POD) — NÃO reescrever descrições deles.

## A8. Tema (limites técnicos)
- **API NÃO escreve no tema PUBLICADO** (writes em MAIN bloqueados). Fluxo p/ mudança de tema: themeDuplicate → editar a cópia → **a dona publica** no admin. Ajustes simples (nº de produtos na home, layout mobile) → passar o caminho do editor à dona OU duplicar+editar.

## A9. Ética & guardrails (sempre)
- **Nunca enganar o cliente** (prazo, isenção, foto que não é a peça).
- **Risco legal/marca** (marca registrada, nome de famoso, réplica, pele real) → ARCHIVE + avisar a dona (não decidir sozinho o que é ambíguo).
- **Reversível > destrutivo:** cortes da rotina = DRAFT (nunca ARCHIVE/delete em massa); sempre com tag datada pra reverter; sempre reportado.
- **Nunca apagar** produto/coleção/post. **Nunca** criar/ativar anúncio pago ou ferramenta paga.
- Mudança grande/ambígua ou outward-facing → **perguntar antes** (AskUserQuestion), não agir.

## A10. Ritmo operacional (todo run)
- **Relatório SEMPRE** em outputs/reports/<data>-<hora>-*.md, mesmo sem mudanças. 1ª linha = status de frescor ("✅ COM MUDANÇAS" / "⏸ SEM MUDANÇAS desde <data>").
- **Fluxo git/PR padrão:** branch a partir de origin/main → commit → push → abrir PR **draft** → esperar CI (build-and-deploy) verde → tirar de draft → **squash merge**. Mensagens de commit terminam com o link da sessão.
- **Operações em lote** (limpeza/repricing/tags de muitos produtos): usar subagente com mutations GraphQL aliased em lotes (≤8–10/call), logar resultados, reportar userErrors.
- Atualizar a Parte B desta memória ao final.

---
# PARTE B — ESTADO ATUAL & BACKLOG (atualizar a cada run)

## B1. Coleções (smart, por tag)
- weekly-edit · maison-doux · linen-house · voltage-drop · sets-co-ords (41) · New Arrivals (gid 476835381503, tag `new-arrival`, ~45 ativos, alimenta a home) · **Fast U.S. Delivery** (tag `Shopify Collective`, EUA 3–7d) · **Inverno Elegante BR · Entrega em até 10 Dias** (gid 481643102463, tag `cj-br`, 7 peças) · **Trendy** (gid 481744257279, tag `trendy`, 6 ativos — praia/modelagem/off-season).

## B2. Migração CJ (em andamento)
- App CJ conectado (location cjdropshipping). Fluxo: dona conecta no app → eu valido estoque/margem, troco `migrate-to-cj`→`cj-connected`, marco `cj-br` se entrega rápida, troco fotos em alta via API.
- Fila/planilha: outputs/reports/anexo-2026-06-12-cj-sourcing-fila.(md|csv). ~13 conectados, restante pendente.
- Pendência dona: dizer quais saem do Brasil (p/ `cj-br`) e mandar links CJ (p/ trocar fotos).

## B3. Tradução
- pt-BR publicado; cobertura PARCIAL (antigos ok; imports novos + coleções novas SEM PT). Falta instalar Translate & Adapt + Geolocation (admin). Oferta aberta: registrar PT via API das peças-herói de inverno.

## B4. Tema (pendências da dona no editor)
- Home: setar "Maximum products = 9" na seção de novidades (fonte New Arrivals já pronta).
- Mobile: aguardando a dona dizer o que está ruim (ou duplicar tema→editar→ela publica).

## B5. Tags de trabalho ativas
- `migrate-to-cj` · `cj-connected` · `cj-br` · `needs-photo-refresh` (9) · `oos-hidden-2026-06` (23) · `long-tail-cut-2026-06` (379 DRAFT) · `off-positioning-review` (zerada — viraram `trendy`).

## B6. Backlog priorizado
- [ ] Migração CJ: conectar pendentes + variantes faltantes dos 5 parciais.
- [ ] Substituto sem marca p/ Retro F1 Jacket (era top-seller, arquivada).
- [ ] Dona: default stock no app Zendrop (50.000 fake nas variantes ativas).
- [ ] Sessão de fotos própria p/ heróis $45+ (Chic Elise primeiro).
- [ ] Brasil Edit: sourcing (tricô + canga/crochê/palha/semijoia) via CJ-BR/nacional.
- [ ] Collective: pedir reposição de estoque aos fornecedores (83 drafts zerados).
- [ ] Manychat fluxo "Comment EDIT".

## B7. The Edit — imagens já usadas (não repetir)
- #001: …/c7Aibl7z4tQTBzE.webp (Genuine Leather Handbag) · #002: …/CN7123.jpg (Boat Neck Mix-Media) · #003 (agendada seg 15/jun): …/CCJ6151_7.jpg (Beaded Peplum Jacket). Próximo novo: qui 18/jun (#004).

## B8. Últimas mudanças (máx ~8 linhas, apagar antigas)
- 13/jun: 28 imports CJ limpos (vendor→The BB's Box) · coleção Trendy criada (6 off-season movidos, não draftados) · Inverno Elegante BR renomeada p/ "até 10 dias" + 7 peças · pesquisa fornecedores nacionais (tricô+alfaiataria) · descrições de coleção alinhadas a EN-primário · auditoria de tradução (parcial) · memória consolidada v2.0.
- 12/jun: auditoria executada (5 riscos arquivados, 4 erros de preço, piso em 669 variantes, 153 descrições limpas, 379 cauda-longa→DRAFT, 23 OOS→DRAFT, Fast U.S. Delivery criada, 8 produtos migrados ao CJ).
