# MEMÓRIA OPERACIONAL — The BB's Box
*Lida pela rotina de growth no início de CADA execução. Atualizada pela rotina ao final (commit junto com o relatório). Última atualização: 2026-06-12 v1.6 (regra de relatório sempre + posicionamento "tendência acessível e elegante" + estratégia de canais).*

## Fatos da loja (estáveis)
- Loja: thebbsbox.com · myshopify: af0150-3.myshopify.com · plano Basic · USD
- 3 universos de marca: Maison Doux 🌸 (romântico/floral) · The Linen House 🌾 (linho/neutros) · VOLTAGE DROP ⚡ (jeans/paetês/ousado)
- Tags de marca nos produtos têm prefixo `world-`: `world-maison-doux` (39), `world-linen-house` (38), `world-voltage-drop` (14)
- Coleções: weekly-edit (tag `weekly-edit`) · maison-doux · linen-house · voltage-drop (criadas 11-12/jun/2026, smart por tag)
- Blogs: "News" (gid://shopify/Blog/90479263999) · "The Edit — Fashion Journal" (gid://shopify/Blog/105419768063, handle the-edit, edições numeradas 2x/semana seg+qui)
- Página da fundadora (linkar em TODO artigo do The Edit): /pages/the-founder-a-love-letter-to-fashion-vintage-bags
- Links rastreáveis fixos: IG/TikTok bit.ly/43qQJXX · FB bit.ly/4uowANi · GBP bit.ly/4us3tbR
- Fornecedores: Zendrop (maioria, ~520 produtos vendor "The BB's Box"), Modalyst (29 c/ tag), SPOD/Spreadconnect (POD), Pixels/Gearbubble (POD — NÃO reescrever descrições deles)

## Lições aprendidas (não repetir erros)
- Tema publicado NÃO aceita escrita via API → fluxo: themeDuplicate → editar a cópia → dona publica no admin
- Estoque fantasma (50.000 un.) pertence à LOCALIZAÇÃO DO APP ZENDROP — API externa não consegue alterar (INVALID_LOCATION); correção é no painel do Zendrop (default stock quantity)
- Busca `tag:x` do Shopify faz match parcial — confirmar tag exata lendo product.tags antes de criar smart collection
- Pacotes internacionais para o BR: manter <US$50 (MP 1.357/2026 isenta importação; ICMS ~17-20% continua); Zendrop China→BR = 20-45 dias (não prometer rapidez); para entrega rápida BR: CJ Dropshipping armazém BR ou fornecedor nacional

## Feito (não refazer)
- 2026-06-09/12: SEO completo (tags+meta) em 12 produtos weekly-edit · blog post "Weekend Outfits, Solved" (News) · link 404 sets-co-ords→new-arrivals corrigido na página weekly-edit
- 2026-06-12: Style Quiz consertado (bilíngue PT/EN, emojis, bug seleção) · hero da home trocado (fotos com modelo) · 3 páginas de marca funcionando · The Edit Edition #001 publicada · página da fundadora criada · camisa vôlei "HOT SELL" → draft
- 2026-06-12: limpeza de catálogo — 40 produtos (rodada 1: descrições reescritas, lixo AliExpress removido, SEO, 14 títulos encurtados) + rodada 2 (~27 produtos + alt text) — checar relatório da rodada 2

## Backlog (pendências conhecidas — priorizar nos checks)
- [ ] Dona: configurar default stock no app Zendrop (7.947 variantes com 50.000 fake)
- [ ] 49 produtos com 1 foto só (subir mais fotos nativas)
- [ ] 25 produtos ACTIVE com estoque 0 rastreado (despublicar ou repor — decisão da dona)
- [ ] 3 produtos com suspeita de vínculo Modalyst quebrado (conferir no admin)
- [ ] Alt text com lixo em produtos antigos (rodada 2 cobre parte)
- [ ] Coleção "Inverno Elegante BR" com peças de entrega rápida (CJ armazém BR / fornecedor nacional)
- [ ] Coleção "Brasil Edit": sourcing dos 8 itens da curadoria aprovada (ver seção Curadoria) + conteúdo PT-BR de lançamento
- [ ] Dona: criar conta na CJ Dropshipping e instalar o app na Shopify (links na seção Fornecedores)
- [ ] Manychat fluxo "Comment EDIT" (ativação manual pendente)




## POSICIONAMENTO & ESTRATÉGIA DE CANAIS (v. 12/jun/2026 — manda em TODO conteúdo)
**Posicionamento:** "Tendência acessível e elegante" — attainable luxury. A BB's Box é CURADORIA,
não catálogo. Nível médio-alto. Teste obrigatório antes de publicar qualquer conteúdo:
"isso poderia parecer um achadinho de Shein?" → se sim, NÃO publica.


**ORGÂNICO PRIMEIRO (norte de tudo — sem mídia paga, JAMAIS):**
O objetivo é visualização e clique orgânicos; a venda vem do POSICIONAMENTO, não de anúncio.
- KPIs que importam: views orgânicos, saves/shares (IG/TikTok), CTR dos links bit.ly,
  impressões de busca (Google/GBP), tráfego do blog. Reportar esses números no relatório
  da rotina sempre que disponíveis.
- Como ganhar alcance sem pagar: (1) gancho nos 2 primeiros segundos de todo vídeo;
  (2) conteúdo "salvável" (guias de styling, fórmulas de look) — save > like;
  (3) SEO em TUDO: legendas com termos pesquisáveis, blog The Edit mirando long-tail
  ("what to wear to..."/"como usar..."), meta tags de produto (já aplicadas), GBP semanal;
  (4) consistência > volume: cadência fixa (rotina 2x/dia + blog 2x/semana) e formato
  reconhecível (as colunas do The Edit, os 3 mundos);
  (5) comunidade: responder comentários/DMs (fluxo EDIT), enquetes, UGC quando surgir.

**Regras transversais (todos os canais):**
- Marketing destaca SOMENTE peças de US$45+ (Show Skirts $125, vestidos $225-295, jaquetas
  $108-145, JW PEI $45+). Itens <US$25 NUNCA aparecem em posts, vídeos, blog ou GBP.
- Visual: foto/vídeo com modelo, movimento e luz editorial. PROIBIDO: fundo branco de
  marketplace, colagens de produto, price stickers gritantes, "HOT SELL"/"SALE %OFF" no criativo.
- Linguagem: "investment piece", "curated", "ready-made looks", "edit" — nunca "cheap",
  "achadinho", "promoção relâmpago". Bilíngue EN + PT-BR (Brasil = mercado prioritário).
- Âncoras de credibilidade: os 3 mundos (Maison Doux/Linen House/Voltage Drop), o Style Quiz,
  o The Edit (revista) e a fundadora (bolsas vintage/luxo) — usar como prova de curadoria.

**Minta (vídeos automáticos):** templates minimalistas/editoriais; apenas produtos da
collection weekly-edit e dos 3 mundos (respeitando o piso de $45); música elegante;
CTA fixo "Shop the edit" com bit.ly/43qQJXX; nunca usar template de "oferta/desconto".

**Instagram:** grid alterna os 3 mundos; Reels de styling ("one piece, three ways", GRWM
elegante); carrosséis com tipografia limpa; Stories = enquetes + link sticker; hashtags de
nicho (#quietluxury #capsulewardrobe #investmentpieces #modaelegante) — proibido
#cheapfinds #shein #achadinhos.

**TikTok:** narrativa de styling e qualidade ("the $125 skirt that replaces 3 outfits",
"investment pieces under $150"), vintage bag corner em vídeo, POV elegante; NUNCA formato
"haul barato"; responder comentários EDIT com o link.

**Google (GBP + SEO):** updates semanais com tom de boutique (qualidade, curadoria, novidade);
keywords: "elegant women's fashion", "curated boutique", "quality over quantity", "moda
feminina elegante" — nunca "cheap/discount/barato". Produtos <$25 fora de qualquer destaque.

**Catálogo a serviço do posicionamento:** itens estilo marketplace (<$25, título/foto de
AliExpress) são candidatos permanentes a DRAFT; vitrines (home, collections destacadas,
blog) só exibem peças alinhadas ao posicionamento.

## Fornecedores — entrega rápida no Brasil (estratégia ativa)
**Objetivo:** vender mais no BR com prazo curto. Zendrop China→BR = 20-45 dias (NÃO usar para promessa de rapidez).
- **CJ Dropshipping — armazém no Brasil (prioridade #1):** entrega local 2-3 dias.
  - Site BR: https://br.cjdropshipping.com · Global: https://cjdropshipping.com
  - App Shopify (integra direto na loja): https://apps.shopify.com/cjdropshipping
  - Armazéns globais (referência): https://cjdropshipping.com/blogs/cj-news/CJ-s-Global-Warehouses
  - Como usar: criar conta → filtrar produtos por "warehouse: Brazil" → importar para a Shopify pelo app.
- **Fornecedores nacionais (plano B / artesanais):** Racy Modas, Mais Que Distribuidora, Sua Fábrica, Kaisan (moda fitness).
  - Diretórios com contatos atualizados: https://www.nuvemshop.com.br/blog/dropshipping-fornecedores/ e https://fornecedoresdeconfianca.com.br/fornecedores-dropshipping-nacional/
- **Regra fiscal:** pacotes internacionais ≤ US$50 (MP 1.357/2026 isenta importação; ICMS ~17-20% segue). Com estoque local, cliente não paga taxa — usar como argumento de venda.


## Mapa de apps de fulfillment (auditado 12/jun/2026)
- VIVOS: Zendrop (~520 produtos, o maior) · DSers/AliExpress (21 produtos, ver abaixo) · Modalyst (250+ var.) · Pixels (125, POD) · Syncee (10 produtos) · SPOD/Spreadconnect (6) · Gearbubble (5) · Shopify Collective (16 fornecedores; My Pampered Life 14/14 esgotados)
- MORTOS/REMOVIDOS: Spocket (0 itens — desinstalado) · Printful (desinstalado; único produto, o planner digital, foi para DRAFT em 12/jun)
- DSers — PLANO DE APOSENTADORIA GRADUAL: alimenta 14 ativos = 8 tema "Brasil barato" (candidatos a draft) + 6 peças boas (2 conjuntos office, vestido de renda, blusa, Mini Tartan Bag, JW PEI Yara Tote — estas já reescritas com SEO). Antes de desinstalar o DSers, re-sourcing das 6 boas via CJ. NÃO desinstalar enquanto houver ativos dele.
- Regra: ao avaliar fornecedor, checar estoque da LOCALIZAÇÃO do app (location.inventoryLevels) — app sem itens estocados = morto.

## Curadoria "Brasil Edit" (caçada aprovada pela dona — 12/jun/2026)
Itens cool/únicos de cultura brasileira para sourcing (CJ armazém BR ou nacional) e conteúdo:
- Biquíni de crochê forrado (Maison Doux) · Canga artística estampas tropicais (todos os mundos)
- Saída de praia de crochê (Maison Doux) · Bolsa de palha trançada (Linen House + Vintage Bag Corner)
- Semijoias douradas com pedras brasileiras (Voltage) · Vestido estampa tropical estética FARM Rio (Maison Doux)
- Renda renascença / bordado nordestino (Linen House) · Peça "torcida chic" verde-amarelo não-jersey (Voltage — Copa 2026 em jun/jul!)


## Regra de relatório (obrigatória em TODO run)
- TODO run commita um relatório em outputs/reports/, MESMO SEM MUDANÇAS.
- A primeira linha do relatório deve declarar o status de frescor:
  "**Status:** ✅ COM MUDANÇAS" ou "**Status:** ⏸ SEM MUDANÇAS — loja igual desde <data/hora do último relatório com mudanças>; verificação completa executada agora."
- Em runs sem mudanças, o corpo pode ser enxuto (diagnóstico + checks + confirmação), mas o arquivo SEMPRE é criado — o painel da dona depende disso para mostrar que a ferramenta está viva.

## Regras editoriais do The Edit (obrigatórias em TODO post)
- TODO artigo deve ter PELO MENOS 1 imagem: definir a featured image via API
  (REST: "image": {"src": "<url>", "alt": "<descrição> — The Edit, Edition #NNN | The BB's Box"}).
- Fonte das imagens: fotos de produtos da própria loja (cdn.shopify.com da The BB's Box),
  escolhendo uma peça citada/condizente com o tema da edição.
- NUNCA repetir imagem entre posts: antes de escolher, conferir a lista abaixo; depois de
  publicar, ADICIONAR a URL usada à lista (e commitá-la junto com o relatório).

### Imagens já usadas no blog (não repetir)
- Edition #001: https://cdn.shopify.com/s/files/1/0677/7343/2063/files/Sa65860e5b94442cfb8acaaabcea2d390k.webp (JW PEI Yara tote)
- Edition #002: https://cdn.shopify.com/s/files/1/0677/7343/2063/files/CN7123.jpg (Boat Neck Mix-Media dress)

## Últimas mudanças (rotina: registrar aqui o que alterou, máx. 10 linhas, apagar as antigas)
- 12/jun (run manual): Edition #002 publicada ("Quality Is the Loudest Flex") · 8 itens Brasil-marketplace + planner Printful → DRAFT (total 785 ativos) · Spocket/Printful liberados p/ desinstalar · estratégia v1.4 aplicada em todo conteúdo do run
