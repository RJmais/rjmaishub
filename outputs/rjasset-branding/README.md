# RJ+ Asset — Kit de sincronização visual WordPress ⇄ Gamma

*Gerado em 12/07/2026. Fonte de verdade: Gamma "RJ+ Asset" (https://gamma.app/docs/RJ-Asset-mwj00jvbrlzu0l1).*

## Status

✅ **APLICADO em produção em 12/07/2026** via mecanismo nativo do WordPress
(Customizer → CSS adicional, publicado no tema `rjasset-institutional`).
O arquivo `wordpress-additional-css.css` deste diretório é o CSS exato que
está no ar. Validado: estrutura, menus, links e conteúdo 100% intactos
(diff de tags e hrefs antes/depois idêntico); CSS emitido em
`<style id="wp-custom-css">` em todas as páginas.

Site inspecionado: WordPress 7.0.1, tema custom `rjasset-institutional`
v0.1.0 (variáveis CSS em `:root` — mecanismo ideal para re-skin sem tocar em
templates), fontes Fahkwang + Verdana, plugins cookieadmin/formlayer,
ModSecurity ativo no servidor. O CSS adicional estava vazio antes da
aplicação (nada foi sobrescrito).

## 1. Branding encontrado no Gamma

### Tema
- Tema custom do workspace: **"Tema sem título"** (id `pj7eaoqk029tr6z`),
  derivado do padrão **Chimney Dust** — palavras-chave de cor: *dark, gray,
  dark gray, charcoal gray, black, chrome, silver, gradient*; tom: *serious,
  corporate, formal, simple, clean, subtle, bold, high tech, mature*.
- Formato: webpage, cards fluidos, fonte tamanho `sm`, conteúdo centralizado.

### Paleta (extraída do documento)
| Token | HEX | Origem / uso no Gamma |
|---|---|---|
| Preto base | `#000000` | Fundo explícito das seções "Quem Somos" e "Políticas da Gestora" |
| Cinza claro | `#CCCCCC` | Fundo explícito da seção "Uma gestora independente" |
| Branco | `#FFFFFF` | Texto sobre fundos escuros |
| Grafite (derivado) | `#141414` | Surfaces/cards sobre preto |
| Chumbo (derivado) | `#2B2B2B` | Bordas, hovers, elementos secundários |
| Prata (derivado) | `#C7C7C7` | Texto secundário sobre escuro, detalhes "chrome" |
| Gradiente chrome (derivado) | `linear-gradient(135deg,#0B0B0B,#3C3C3C 55%,#6E6E6E)` | Acentos metálicos do tema |

> Os itens "derivados" seguem as palavras-chave do tema (charcoal/chrome/silver/
> gradient); os três primeiros são valores exatos presentes no documento.

### Tipografia
A API do Gamma **não expõe** as famílias tipográficas do tema custom.
Confirmar no editor do Gamma (Tema → Fontes) antes de fixar. Provisório
recomendado (sans grotesca corporativa, coerente com o tom do tema):
`"Inter", "Helvetica Neue", Arial, sans-serif`. **Atenção:** a marca-mãe RJ+
(BRAND.md deste repo) usa Fahwang/Verdana — a sub-marca Asset no Gamma é
visualmente distinta (monocromática); em dúvida, validar com a diretoria.

### Componentes e layout do Gamma
1. **Hero** — imagem full-bleed atrás do texto (skyline Rio/escritório),
   título display "RJ+ Asset", subtítulo "Gestão de recursos com método e
   disciplina", 2 botões: primário sólido ("Falar com a RJ+ Asset") +
   variante outline ("Conhecer a gestora").
2. **Quem Somos** — fundo preto, 3 cards em caixas com contorno (outline
   boxes): Nossa essência / Nossos valores / Nossa estrutura.
3. **Uma gestora independente** — fundo cinza `#CCCCCC`, 2 colunas
   (imagem Ipanema à esquerda, texto à direita), divisor `<hr>`.
4. **Vamos conversar** — 2 colunas, embed Typeform
   (`https://rjpeoplecare.typeform.com/to/kuxAxAZk`), aviso de privacidade em
   itálico, blockquote com disclaimer legal e e-mail
   `atendimento@rjasset.com.br`.
5. **Políticas da Gestora** — fundo preto, 4 colunas com PDFs embutidos
   (Manual de Compliance, consulta CVM, Política de Rateio/Divisão de Ordens,
   Política de Gestão de Risco) + imagem institucional
   `Gestao-de-Recursos-Permanente-03.jpg`.

### Assets do Gamma (para reaproveitar no WordPress)
- Hero: `https://cdn.gamma.app/b0rzn1gw3i2hdft/generated-images/jdECTpNw_HMU6ScuXgcYy.png`
- Ipanema: `https://cdn.gamma.app/b0rzn1gw3i2hdft/generated-images/rNLNAj4jERss0Bq8-s-L5.png`
- Reunião: `https://cdn.gamma.app/b0rzn1gw3i2hdft/generated-images/o4jK6OJWovRzJgUZuoXvm.png`
- Arte institucional: `https://cdn.gamma.app/b0rzn1gw3i2hdft/d9810633b33749b7b727d1fdad2facd6/original/Gestao-de-Recursos-Permanente-03.jpg`
- PDFs de políticas (3) no CDN do Gamma — baixar e hospedar na Biblioteca de
  Mídia do WordPress em vez de hotlinkar.

## 2. Arquivos deste kit
- `wordpress-additional-css.css` — CSS global pronto para
  **Aparência → Personalizar → CSS adicional** (não altera estrutura,
  só cores/tipografia/botões/links).
- `checklist-aplicacao.md` — passo a passo no wp-admin, na ordem de
  prioridade da missão, respeitando as restrições (não mover blocos, não
  alterar menus/links/estrutura).

## 3. Riscos e limitações conhecidos
- CSS foi escrito **às cegas** (site inacessível): os seletores cobrem
  Gutenberg, Elementor e temas comuns, mas devem ser validados na primeira
  aplicação — começar com o bloco de variáveis e ir liberando seções.
- Fontes do tema Gamma não confirmadas (limitação da API).
- Logo/favicon: nenhum arquivo de logo da RJ+ Asset foi localizado; o Gamma
  usa apenas texto + a arte `Gestao-de-Recursos-Permanente-03.jpg`. Sugerido
  produzir logo branco (fundos escuros) e escuro (fundos claros) + favicon
  512×512.

---

## Rodada 2 — 12/07/2026 (conteúdo, formulário e pt-BR)

Executado ao vivo no wp-admin (tudo validado como visitante anônimo):

1. **PDFs de políticas**: os 3 arquivos enviados eram byte-idênticos aos já
   presentes na Biblioteca de Mídia (ids 19–21). Os cards da seção "Políticas
   da Gestora" agora linkam para eles (defaults em `functions.php`); o link
   da CVM foi preservado. Não há mais "Documento pendente".
2. **Formulário próprio**: criado no plugin FormLayer ("Contato RJ+ Asset",
   shortcode `[formlayer id="1"]`), 100% em pt-BR (nome, e-mail, assunto,
   mensagem, consentimento LGPD), notificações para
   **atendimento@rjasset.com.br** (envio via GoSMTP). Substituiu o botão
   Typeform no box de contato da home. Teste de envio real: OK.
3. **Gramática/acentuação**: corrigidos todos os textos do tema
   (front-page, header, footer, 404, página de políticas, schema/título),
   títulos e conteúdos das páginas Política de Privacidade e Termos de Uso,
   item de menu "Políticas" e tagline do site. Texto real do Gamma aplicado
   na seção "Uma gestora independente" (fim do PLACEHOLDER público) + imagem
   da seção (attachment id 23).
4. **Logo**: agora é um `<img>` real no header (attachment id 22, via
   `header.php` — ACF não está instalado no site); o hack CSS foi removido.
5. **Idioma**: WPLANG já era `pt_BR`; `<html lang="pt-BR">` confirmado.
6. **⚠️ Plugin `rjasset-staging-setup` DESATIVADO**: ele rodava em todo
   `admin_init` re-semeando placeholders (revertia qualquer edição de
   conteúdo) e forçando `blog_public=0`. A desativação era pré-requisito
   para as correções persistirem. Cópia das correções de tema em
   `theme-files/`.
7. **Indexação liberada (12/07/2026, com aprovação da cliente)**:
   `blog_public=1` aplicado em Configurações → Leitura; validado que a tag
   `noindex` não é mais emitida nas páginas públicas.
