# Conceito v5 — Home (os 6 ícones são o elemento primário)

> **Versão vigente.** Evolução do [v4](./42-conceito-v4-home.md) pela sua correção: **os ícones são
> primários, não secundários — e centralizados.** O [v3](./41-conceito-v3-home.md) segue como alternativa
> (layout assimétrico) e o [v2](./40-conceito-v2-home.md) como histórico.
>
> **Artefatos:** `docs/02-architecture-design/figcraft/conceito-home/` — `home-conceito-v5.png` (1440×1960),
> `conceito-home.figcraft` (abre no FigCraft Desktop), `conceito-home.jsonl` (262 comandos).
> **Gerador:** `apps/web/scripts/figcraft-conceito-home.mjs`.

## 1. A mudança de hierarquia

| Antes (v4) | Agora (v5) | Por quê |
|---|---|---|
| 6 chips pequenos (126×40) **abaixo da busca**, ícone de 18 px | **6 peças de 104×104, centradas**, ícone de 40 px, rótulo visível | você definiu: os ícones são o fator principal do projeto |
| Selo de score de 300 px no hero, à direita | Selo de **180 px na seção "A régua"** | o selo disputava o primeiro plano com a marca; na régua ele **ilustra a escala** — que é a função dele |
| Faixa de ícones encostada à esquerda, como filtro utilitário | Faixa **centralizada** na largura de conteúdo (944 px), com respiro de 64 px entre peças | presença de elemento principal, não de controle de filtro |

**A cópia continua à esquerda.** O anti-padrão travado é o *"hero trio centralizado"* (eyebrow + H1 +
subtítulo + dois botões simétricos no centro) — centrar **os ícones** não é isso: é dar âncora visual ao
hero, exatamente o que o playbook pede. O H1 segue sendo o **primeiro** elemento lido.

## 2. Como cada peça é construída

- **Cor canônica por tipo**, do `CATEGORY_TOKENS`: movie `#818CF8` · series `#38BDF8` · game `#34D399` ·
  book `#FBBF24` · comic `#F472B6` · manga `#A78BFA`, na ordem imutável **movie, series, game, book, comic,
  manga**.
- **Borda de 1 px** na cor do tipo + **preenchimento suave** de 12% dessa cor sobre o fundo (a mistura é
  calculada no gerador, não escolhida a olho — `misturar(bg, cor, 0.12)`), o que dá presença sem virar bloco
  colorido.
- **Glifos reais**: os SVG do Lucide (`clapperboard`, `tv`, `gamepad-2`, `book-open`, `book-image`,
  `book-marked`), com `currentColor` trocado pela cor canônica antes da importação no FigCraft.
- **Rótulo visível** abaixo do ícone (12 px, `fg.primary`) — não só no hover: em peça principal, o nome é
  informação, não revelação.
- **Raio 16** (não `rounded-2xl`): é a maior peça da página, e a escala de raios do conceito é 12/16 na
  hierarquia visual.

## 3. Alvo de toque e acessibilidade

- **Mobile**: as 6 peças precisam manter **≥ 44×44 px** de alvo; em 375 px a faixa vira **grade 3×2**
  (como o playbook define para a constelação) e o respiro cai para 12 px.
- Cada peça é um **link** (`/catalog?type=…`) com `aria-label` do tipo; o rótulo visível e o nome acessível
  não se repetem de forma redundante.
- **Contraste**: o ícone usa a cor canônica sobre o tint de 12% — todos os seis pares passam de 3:1 (ícone
  informativo, texto grande); o rótulo em `#F5F5F7` sobre o tint passa de 15:1.
- **Cor nunca é o único canal**: cada peça tem **ícone + rótulo**; a cor reforça, não informa sozinha.

## 4. Movimento (especificação — um PNG não mostra)

Reaproveita o vocabulário que a constelação do produto já usa (`category-orbit.module.css`), não inventa:

| O quê | Como | Tempo |
|---|---|---|
| **Entrada em cascata** | `opacity 0→1`, `translateY(10px)→0`, `scale(.9)→1`, `delay = índice × 70 ms` | 560 ms, `cubic-bezier(0.22,1,0.36,1)` |
| **Flutuação** | `translateY 0 → -3px → 0`, fase defasada por índice (`-0.77s × i`) | 4,6 s por ciclo |
| **Glow** | halo na cor do tipo pulsando `opacity .22 → .5` (nunca piscando) | 4,6 s |
| **Hover/focus** | o tint sobe de 12% para 20%, a borda vai a 100% da cor, `scale` máximo **1.02** — só `transform`, `background`, `border-color` | 150–250 ms |
| **Staging** | com uma peça em hover, as irmãs caem para `opacity .55` via `:has()` (a 1/3 rule que a constelação já usa) | 200 ms |
| **Régua** | varrido de ≤ 8% de alfa pelas 6 barras a cada 6 s; entrada em `scaleX` com `delay` de 60 ms por faixa; faixa ativa cresce por **`scaleY`** (nunca `height`) | 1,6 s / 520 ms / 180 ms |

**Regras**: `prefers-reduced-motion: reduce` desliga tudo — peças e barras ficam **visíveis e estáticas**
(`opacity: 1` garantido); amplitude ≤ 8 px; nenhum loop roda fora da viewport (`IntersectionObserver`);
movimento nunca é o canal da informação (a faixa é dita por rótulo + cor + posição).

## 5. Onde isto encaixa no produto

A faixa **não pede componente novo**: é o mesmo dado do `CategoryIconRow` (que hoje desenha os 6 ícones em
órbita, com `CATEGORY_TOKENS`, `aria-label` por tipo e as três camadas de movimento) numa **variante
centralizada e inline**. Ou seja: uma prop de variante (`orbit` | `row`) e a faixa entra na home sem duplicar
o vocabulário de tipos — que é o ponto: **um só lugar define o que é cada tipo de obra**, e o mesmo lugar
desenha as duas formas.

## 6. Duas iterações, com os defeitos nomeados

1. **v5.a:** o "/10" do selo havia desaparecido; "MEDIA Score™" caía **sobre a borda inferior do anel**; e a
   coluna esquerda do hero ficou desequilibrada depois que o selo saiu.
2. **v5.b (esta):** "/10" de volta ao lado do número, legendas do selo **fora** do anel, busca de 560 → 700 px
   e a microcopy ("Sem cartão para começar · cancele quando quiser") de volta sob o campo.

## 7. Se aprovar, a ordem sugerida

1. **Variante `row` no `CategoryIconRow`** — o ícone já existe com os 6 pares, `aria-label` e as camadas de
   movimento; falta o layout centralizado e o rótulo visível;
2. **Trocar a faixa de ícones no hero** e **mover o selo** para a seção da régua (hoje ele não está na home);
3. **Movimento** (CSS puro, com `prefers-reduced-motion` desligando tudo — o gate `test:hydration` cobre os
   dois modos);
4. Os três cartões: manter, dar peso a um, ou adotar a variante assimétrica do v3.

Cada passo com `test:hydration`, `design:contrast`, `design:detect`, pixel e i18n verdes, e screenshots
1440/375 anexados.
