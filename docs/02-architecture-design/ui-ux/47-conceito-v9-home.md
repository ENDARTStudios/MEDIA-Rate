# Conceito v9 — Home (CTA novo, alinhamento, idioma, carrosséis e rodapé)

> **Versão vigente.** Atende cinco pedidos seus sobre a base do [v8.2](./46-conceito-v8-home.md), todos
> ancorados no que o projeto **já tem** — depois de três erros meus por desenhar de memória, a regra passou a
> ser ler a fonte de verdade antes de desenhar.
>
> **Artefatos:** `docs/02-architecture-design/figcraft/conceito-home/`
> — `home-v9.png` (1440×3500, a tela) · `selo-estados.png` (o ciclo do selo)
> — `icones-dock.png` (o efeito Dock em três estados) · `conceito-home.figcraft` (3 páginas, 1032 comandos)
> **Gerador:** `apps/web/scripts/figcraft-conceito-home.mjs`

## 1. O CTA

O H1 passou a ser a frase que você definiu: **"Descubra o que vale o seu tempo para assistir, ler e jogar."**
— em três linhas explícitas (a 42 px), porque em uma linha só ele quebrava sozinho e uma linha caía sobre a
outra. O bloco de texto desceu junto (subtítulo em 300, busca em 366, microcopy em 436) para nada encostar.

## 2. Alinhamento — a correção estrutural

Antes eu posicionava números soltos e a página ficava torta. Agora tudo nasce de um sistema:

| Constante | Valor | Uso |
|---|---|---|
| `M` | 64 | margem única de todas as seções |
| `CONTEUDO` | 1312 | largura útil (64 → 1376) |
| `COL3` / `col3(i)` | 416 com 32 de vão | cartões de decisão e as 3 etapas do método |
| `COL6` / `col6(i)` | 218 com 16 de vão | as 6 faixas da régua |
| `DIREITA` | 1376 | CTA, setas dos carrosséis, último card |

Os títulos de seção, as linhas divisórias e o fecho usam `M`/`CONTEUDO` — não há mais coordenada "no olho".
Também corrigi o frame, que estava menor que o conteúdo (3320 → 3500) e depois **mais largo** que a página
(a caixa de texto da atribuição ia até 1582 porque eu centrei o texto sem encurtar a largura).

## 3. Seletor de idioma

Reproduzido de `LocaleSwitcher.tsx` (o mesmo componente que vive na `Navbar`):

- **globo de 14 px** (`circle r=10` + `ellipse rx=4 ry=10` + `path M2 12h20`), `strokeWidth 2`;
- sigla do locale (PT) + **chevron de 12 px** que gira 180° quando aberto;
- botão `rounded-md px-2 py-1`, `text-xs`, `#A0A0B8` com hover em accent;
- **dropdown** com `bg #12121C`, `border #1C1C2E`, `min-w-[100px]`, e o item ativo em
  `text-[#818CF8]` sobre `rgba(129,140,248,0.08)` — o mockup mostra o estado **aberto**, com PT ativo.

## 4. Carrosséis por tipo de mídia

Reproduzem `MediaCarousel.tsx`: tile de ícone **32 px** (`h-8 w-8 rounded-lg`) com o ícone de **16 px**
(`h-4 w-4`), `h2` **uppercase** com `tracking-wider`, o total em `tabular-nums`, as **setas** alinhadas à
direita e a trilha com cards de **180 px** (`w-[160px] sm:w-[180px]`, `gap-4`, `snap-x snap-mandatory`);
o último card é cortado pela margem — o convite a arrastar.

**O que é o "animado" (e o que eu não faria):** avanço de um card por clique com **snap suave**, e um
**auto-avanço de 5 s** que **pausa em hover/focus** e **desliga em `prefers-reduced-motion`** — carrossel
que se move sozinho sem pausa viola a WCAG 2.2.2 (o produto, hoje, é scroll-snap manual, que é o
comportamento mais seguro; o auto-avanço é a evolução que você pediu, com as travas certas).

**Sem número inventado:** o total aparece como "títulos no catálogo" porque no produto ele vem da API. Eu
havia escrito "128 títulos" e corrigi — é a regra do D-583.4 valendo para o mockup também.

## 5. Rodapé completo

Reproduz `MotionFooter.tsx`:

| Coluna | Conteúdo |
|---|---|
| Marca | MEDIA Rate + tagline |
| **Produto** | Catálogo · Preços · Sobre · Metodologia · FAQ · Fontes |
| **Legal** | Privacidade · Termos · Meus dados (LGPD) · Cookies · Gerenciar cookies · Segurança · Direitos do titular |
| **Social · Contato** | Telegram · Contato |

E o fecho, exatamente como no original: `MEDIA Rate. Todos os direitos reservados.` ·
`Copyright © 2026 END ART Studios` · **`END ART Studios · CNPJ 45.370.930/0001-75 · Osasco, São Paulo —
Brasil · endart.studios+contato@gmail.com`** e, centralizada em `text-[11px]`, a **atribuição obrigatória**
de TMDB/OGDB/IGDB (crédito exigido pelos termos dos provedores — D0).

## 6. O que continua igual

Os **6 tiles dos tipos** seguem exatamente o `.iconBox` original (raio 22, borda a 26% da cor, fundo a 9%
sobre `#101018`, realce interno, glow) com o símbolo em **62 px** e `stroke-width="1.6"` — e o **efeito
Dock** segue com a queda em cosseno ao quadrado (1,32 / 1,18 / 1,01) e o ciclo do selo sincronizado com a
régua.

## 7. Se aprovar, a ordem

1. **Seletor de idioma + carrosséis** — os dois têm componente pronto (`LocaleSwitcher` está na Navbar; o
   `MediaCarousel` existe) e entram com pouca mudança de layout;
2. **Sistema de alinhamento** — extrair `M`/`COL3`/`COL6` como classes utilitárias do tema (hoje cada seção
   do produto repete seus próprios números);
3. **Auto-avanço dos carrosséis** — com pausa e reduced-motion, e um teste para o estado pausado;
4. Rodapé: já está completo no produto; o mockup confirma que não falta peça.

## 8. Correção v10 — a grade é a do produto, e são SEIS carrosséis

Dois apontamentos do Operador, ambos corretos.

### 8.1 O rodapé estava desalinhado — e a causa era a grade inteira

Eu havia inventado **margem de 64 px (conteúdo de 1312)**. O produto não usa isso: o `MotionFooter.tsx` e o
`MediaCarousel.tsx` usam **`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`** — ou seja, em 1440 px o conteúdo vai de
**112 a 1328** (`max-w-7xl` = 1280, centrado em 80, menos os 32 px de `lg:px-8`). Minha grade estava **48 px
mais larga que a do produto em todas as seções** — por isso tudo parecia desalinhado, não só o rodapé.

A grade agora é a do produto, e o rodapé passou a ser o **`grid grid-cols-4 gap-8`** do original:

| Coluna | x | Largura |
|---|---|---|
| Marca + tagline | **112** | 280 |
| PRODUTO | **424** | 280 |
| LEGAL | **736** | 280 |
| SOCIAL · CONTATO | **1048** | 280 (termina em 1328) |

A linha de baixo virou o `flex justify-between` do original: "MEDIA Rate. Todos os direitos reservados." à
esquerda, "Copyright © 2026 END ART Studios" ao centro e a identificação **END ART Studios · CNPJ
45.370.930/0001-75 · Osasco, São Paulo — Brasil · contato** à direita — com a atribuição de TMDB/OMDb/IGDB
centralizada abaixo.

### 8.2 Faltavam Quadrinhos e Mangás — são duas mídias

Os carrosséis eram três (Filmes, Séries, Games). Agora são **seis, um por tipo de mídia**, na ordem canônica
do `CATEGORY_TOKENS`: **Filmes · Séries · Games · Livros · Quadrinhos · Mangás** — cada um com seu tile de
ícone (32 px) na cor canônica, seu título em uppercase, seu total e sua trilha de cards de 180 px. O frame
passou de 3500 para **4900** px de altura, e o artefato tem **1310 comandos**.

### 8.3 O que eu aprendi nesta rodada

Duas armadilhas minhas, registradas para não repetir: (a) **movi o `x` de um texto sem encurtar a caixa**, e
o frame saiu com 2098 px de largura (a caixa ia de 998 a 2098); (b) usei `colRod(0)` **antes** da declaração
da constante — o gerador quebrou e eu quase apresentei o **PNG antigo** como se fosse o novo. A verificação
que pega os dois é a mesma: **medir o arquivo renderizado** (dimensões, alinhamento) em vez de confiar no
script.
