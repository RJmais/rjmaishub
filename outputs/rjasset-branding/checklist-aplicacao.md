# Checklist de aplicação no wp-admin (rjasset.com.br)

> **12/07/2026 — itens 2, 4, 5 (cores) e 7 EXECUTADOS** via Customizer →
> CSS adicional (publicado e validado). Pendências manuais restantes:
> favicon (site não tem nenhum — item 1), re-hospedar a imagem do hero do
> CDN do Gamma na Biblioteca de Mídia (item 5, hoje via hotlink com
> fallback de gradiente) e confirmar fontes do tema no editor do Gamma
> (item 3 — mantidas Fahkwang/Verdana, que o site já usa).

*Ordem segue as prioridades da missão. Regra de ouro: só cores/tipografia/
imagens — nunca mover blocos, alterar menus, links, conteúdo ou estrutura.*

## 0. Antes de tudo
- [ ] Backup: exportar o site (Ferramentas → Exportar) e/ou snapshot no plugin
      de backup, para reversão fácil.
- [ ] Identificar o mecanismo do site: tema em uso (Aparência → Temas),
      construtor (Elementor? Gutenberg/Site Editor? Customizer clássico?).
      Isso decide ONDE aplicar cada item abaixo.

## 1. Logo e favicon
- [ ] Aparência → Personalizar → Identidade do site (ou Elementor → Site
      Settings → Site Identity):
      - Logo branco nos headers escuros; logo escuro se o header for claro.
      - Favicon (Site Icon) 512×512 com o símbolo RJ+ Asset.
- [ ] Se não existir arquivo de logo da Asset, usar provisoriamente texto
      "RJ+ Asset" estilizado (preto/branco) e sinalizar pendência ao design.

## 2. Cores globais
- [ ] Site Editor (Aparência → Editor → Estilos → Cores) OU Elementor →
      Site Settings → Global Colors OU Customizer → Cores:
      - Primária: `#000000` · Secundária: `#2B2B2B` · Fundo claro: `#CCCCCC`
        / `#F5F5F5` · Texto: `#141414` · Texto sobre escuro: `#FFFFFF`.
- [ ] NÃO trocar a cor de itens que só existem no WordPress (harmonizar:
      convergir para a paleta acima sem remover o elemento).

## 3. Tipografia
- [ ] Confirmar as fontes do tema no editor do Gamma (Tema → Fontes) e
      substituir a provisória (Inter) no CSS se divergirem.
- [ ] Aplicar família global em Estilos/Site Settings; títulos e corpo podem
      usar a mesma família (tema Gamma é monocromático e sóbrio).

## 4. CSS adicional
- [ ] Colar `wordpress-additional-css.css` em Aparência → Personalizar →
      CSS adicional, seção por seção (1→6), conferindo o site após cada uma.
- [ ] Ajustar `border-radius` dos botões ao padrão atual do site (não mudar
      formato estrutural, só cor).

## 5. Banners e seções equivalentes
- [ ] Hero: se existir banner equivalente, aplicar a imagem do skyline
      (baixar do CDN do Gamma → subir na Biblioteca de Mídia) mantendo
      título/CTAs existentes.
- [ ] Seções equivalentes a "Quem Somos"/"Políticas": aplicar classe
      `rja-section-dark`; equivalente a "Uma gestora independente":
      `rja-section-light`. (Classe extra no bloco/section — nada de mover.)

## 6. Imagens e decorativos
- [ ] Substituir imagens genéricas por equivalentes do Gamma (Ipanema,
      reunião) SOMENTE onde houver seção equivalente; caso exista imagem só
      no WordPress, manter (harmonizar com filtro/duotone p&b se destoar).
- [ ] Hospedar os 3 PDFs de políticas na Biblioteca de Mídia se o site tiver
      seção de políticas SEM alterar os links existentes.

## 7. Validação final (obrigatória)
- [ ] Menus idênticos (itens, ordem, links).
- [ ] Nenhuma página criada/removida; permalinks intactos.
- [ ] Todos os links clicáveis continuam apontando para os mesmos destinos.
- [ ] Formulários/embeds funcionando.
- [ ] Mobile: contraste ok em seções escuras (`#CCCCCC`/`#FFFFFF` sobre preto).
- [ ] Lighthouse/leitura rápida: contraste AA nos textos prata sobre preto.
