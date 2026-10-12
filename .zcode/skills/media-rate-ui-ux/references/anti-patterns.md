# Anti-padrões proibidos (D-065 + higiene visual)

## Proibições de marca (D-065, T059 — travadas)

- ❌ **glassmorphism blanket** — blur/transparência em tudo. Vidro só onde há
  função real (badge sobre imagem), nunca como estilo padrão de card.
- ❌ **`rounded-2xl` blanket** — cantos gigantes em todos os elementos.
- ❌ **aurora-blob** — manchas gigantes coloridas desfocadas como fundo
  (ex.: círculo `820px` com `blur(140px)`). Profundidade vem do
  `LayeredBackground` (grão + grid) e de radiais discretos (≤ 8% de alfa).
- ❌ **hero trio centralizado** — eyebrow + H1 + subtítulo empilhados no centro
  com dois botões simétricos. Preferir layout assimétrico com âncora visual.
- ❌ **3 cards iguais em fileira** como seção de destaque.
- ❌ **texto `#FFFFFF`** — usar `#F5F5F7` (primário) ou `#EDE7DC` (tom quente).
- ❌ **emoji como ícone** — só SVG (Lucide), conjunto único.

## Anti-padrões detectados no DOM renderizado (T209)

O detector de DOM (`npx impeccable detect <url>`) mede o que está **pintado** e
pega coisas que a leitura do fonte não vê. Regras com histórico neste repo:

- ❌ **`hero-eyebrow-chip`** — label pequeno em caixa alta com letter-spacing (ou
  o mesmo formato como pill) imediatamente acima de uma headline gigante. É o
  hero padrão de "AI SaaS". O gancho tem de ser o **primeiro elemento**; se a
  marca precisa aparecer, use o hub visual ou a faixa de prova. Corrigido na home
  em T209 (`test/hero-constellation.spec.tsx` guarda o contrato).
- ❌ **`line-length`** — linhas acima de ~80 caracteres cansam a leitura. Aplicar
  `max-w-[65ch]`/`max-w-[70ch]` em parágrafos longos (há ocorrências em
  `HomeContentSections`).
- ❌ **`low-contrast` (pixel)** — texto sobre imagem/pôster: a razão real depende
  do pixel do fundo. Score sobre capa precisa de scrim/gradiente atrás.
- ❌ **`skipped-heading`** — pular nível de heading (h1 → h3) quebra a navegação
  por leitor de tela.
- ⚠️ **`overused-font`** — o detector reclama de Space Grotesk/Inter, que são
  **decisão travada** do design system (V3 §12): aceito por decisão.

## Anti-padrões de interação (MASTER.md + WCAG)

- ❌ hover que desloca layout (mudar `margin`/`padding`/`width`). Use
  `transform`/`opacity`/`box-shadow`/`border-color`.
- ❌ mudança de estado instantânea (sem transição) — 150–300 ms.
- ❌ foco invisível: todo interativo mantém `:focus-visible`
  (`outline: 2px solid #818CF8; outline-offset: 2px`, já global).
- ❌ contraste < 4.5:1 para texto normal e < 3:1 para texto grande/ícones
  informativos.
- ❌ alvo de toque < 44×44 px (mobile).
- ❌ texto sem `text-wrap: balance`/`pretty` em títulos longos.
- ❌ animação que ignora `prefers-reduced-motion`.
- ❌ loop infinito com deslocamento grande ou cintilância (risco vestibular):
  loops só com amplitude pequena (≤ 8 px), opacidade e nunca em vermelho puro
  piscando.

## Anti-padrões de conteúdo

- ❌ promessa perpétua de gratuidade ("grátis para sempre") — T087.
- ❌ número de marketing digitado à mão (fontes/categorias/títulos) — sempre
  derivado de `@/lib/sources` ou da API.
- ❌ "em breve"/"coming soon" apresentado como disponível
  (`home-truthfulness.spec.ts`).
- ❌ sigla crua sem tradução em EN/ES (ex.: "LGPD" — ver
  `i18n-estrutural.spec.ts`).
- ❌ texto de marketing que o produto não entrega (prova inventada, depoimento
  fictício, nota de exemplo apresentada como real).

## Smells que pedem refactor

- Duas fontes de verdade para o mesmo número/lista (ex.: strip de fontes
  hardcoded vs `FONTES_ATIVAS`).
- Componente client onde CSS puro resolve (marquee, entrada, glow).
- `useEffect` + `matchMedia` duplicado em 3+ componentes — use
  `useReducedMotionPref`.
