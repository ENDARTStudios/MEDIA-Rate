# Tokens de design (MEDIA Rate)

Fonte única: `apps/web/src/lib/design-tokens.ts` (espelho TS) e
`apps/web/src/app/globals.css` (variáveis CSS). `design-system/media-rate/MASTER.md`
está DESATUALIZADO (paleta clara `#F8FAFC`/`#DC2626` que não é a do produto) —
em conflito, vence `design-tokens.ts`.

## Superfícies (tema escuro real)

| Papel | Hex | Token |
|---|---|---|
| Fundo base | `#05050A` | `colors.bg` (home usa `#09090F` do `LayeredBackground`) |
| Card | `#12121C` | `colors.cb` |
| Elevado | `#1B1B2C` | `colors.ce` |
| Borda | `#2A2A3D` | `colors.bd` |

`LayeredBackground` adiciona grão SVG (opacity 0.025) + grid 40 px
(`rgba(129,140,248,0.03)`) — profundidade SEM aurora-blob.

## Texto (contraste já validado sobre fundo escuro)

| Papel | Hex | Uso |
|---|---|---|
| Primário | `#F5F5F7` | títulos e corpo principal |
| Secundário | `#A0A0B8` | parágrafos de apoio |
| Muted | `#80809B` | legendas ≥ 12 px (5.3:1 sobre `#05050A`) |

Nunca `#FFFFFF` (proibido por D-065). Nunca `#6B6B85` (reprova AA).

## Acentos

- Marca / CTA / audiência: `#E11D48` (rose).
- Crítica: `#38BDF8` (sky). Índigo/anel de foco: `#818CF8`.
- Faixas de score: ≥9 `#34D399`, ≥8 `#38BDF8`, ≥7 `#818CF8`, ≥6 `#F59E0B`,
  ≥5 `#F97316`, <5 `#F87171`.

## Categorias (CANÔNICAS — não alterar)

| Tipo | Cor | Ícone (Lucide) |
|---|---|---|
| movie | `#818CF8` | `Clapperboard` |
| series | `#38BDF8` | `Tv` |
| game | `#34D399` | `Gamepad2` |
| book | `#FBBF24` | `BookOpen` |
| comic | `#F472B6` | `BookImage` |
| manga | `#A78BFA` | `BookMarked` |

Fonte: `CATEGORY_TOKENS`. Guarda: `apps/web/test/contrast-aa.spec.ts`
("cores canônicas de mídia têm contraste AA sobre fundo e card", D-526).

## Tipografia

- Headings/scores: **Space Grotesk** (`--font-heading`).
- Corpo: **Inter** (`--font-body`). Mono: JetBrains Mono.
- Escala de referência da hero: H1 `text-4xl → lg:text-6xl` com
  `leading-[1.05]` e `tracking-tight`; subtítulo `text-base → sm:text-lg`
  com `leading-relaxed`; microcopy `text-xs`.

## Radius, espaçamento, sombra

- Radius: `rounded-md` (6 px) cards/inputs, `rounded-lg` (8 px) botões,
  `rounded-full` pills, `~22px` tiles de ícone. `rounded-2xl` só quando
  deliberado (proibido em bloco).
- Espaçamento: `--space-xs 4` / `sm 8` / `md 16` / `lg 24` / `xl 32` /
  `2xl 48` / `3xl 64`. Escala Tailwind equivalente (2/4/6/8/12) é o padrão real.
- Sombras: `elevation[1..3]` e `floating`. Glow colorido por categoria usa
  `box-shadow` com `${cor}1f`–`${cor}66`.

## Movimento (tokens)

`motion.duration`: `fast 0.15` / `normal 0.2` / `slow 0.4` / `page 0.3` (s).
`motion.easing`: `out [0,0,0.2,1]`, `in-out [0.25,0.1,0.25,1]`,
`bounce [0.34,1.56,0.64,1]`, `smooth [0.4,0,0.2,1]`.
CSS: `--motion-fast/normal/slow`, `--easing-out`, `--easing-in-out`.

Assinatura de marca adotada para a hero (ver `motion-design`):
**Premium com toque Energetic** — easing-assinatura
`cubic-bezier(0.22, 1, 0.36, 1)`, palette de 3 durações (160/320/720 ms) e
entrada consistente "blur + rise" vinda de baixo.
