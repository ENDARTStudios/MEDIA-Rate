# Fundamentos de UI-UX (compartilhados pelas 22 sessões)

Este documento é a **base comum**: em vez de repetir valores em cada spec, cada sessão referencia os
nomes daqui. Fonte da verdade: `apps/web/src/lib/design-tokens.ts` (310 linhas) + as variáveis de
`apps/web/src/app/globals.css`. Se um valor de tela divergir do que está aqui, **a divergência é a
pendência**, não a exceção.

## 1. Superfícies e texto

| Papel | Token | Valor | Onde usar |
|---|---|---|---|
| Fundo do app | `colors.bg` / `surface.background` / `--bg` | `#05050A` | página |
| Card | `colors.cb` / `surface.card` | `#12121C` | card, painel, linha de lista |
| Elevado | `colors.ce` / `surface.elevated` | `#1B1B2C` | popover, item ativo, "mais popular" |
| Borda | `colors.bd` / `surface.border` | `#2A2A3D` | contorno de card/campo |
| Overlay | `surface.overlay` | `rgba(5,5,10,0.92)` | modal, drawer, banner |
| Anel de foco | `focus.color` / `surface.ring` | `#818CF8`, 2px, offset 2px | **todo** elemento focável |
| Texto primário | `text.primary` | `#F5F5F7` | título, valor |
| Texto secundário | `text.secondary` | `#A0A0B8` | corpo, rótulo, metadado |
| Texto atenuado | `text.muted` | `#85859F` | legenda, "N fontes", placeholder |
| Texto inverso | `text.inverse` | `#05050A` | texto sobre fundo claro/acento |

**Regra:** fundo de card é `#12121C` e **não** `#11111E` (legado migrado no D-604); borda é `#2A2A3D` e
**não** `#1C1C2E`.

## 2. Acento, categorias e score

| Papel | Token | Valor |
|---|---|---|
| Acento da marca | `accent.indigo` | `#818CF8` |
| Acento — texto escuro sobre ele | convenção do repo | `#0F172A` (ex.: `ui/button.tsx`) |
| Público (audiência) | `accent.audience` | `#E11D48` — **como texto**, use `#FB7185` (AA) |
| Rosa AA-safe para texto | usado em `Bar.tsx`, `/sources` | `#FB7185` |
| Categorias | `media.{movie,series,game,book,comic,manga}` via `CATEGORY_TOKENS` | uma cor por tipo, sempre pelo token |
| Faixas de score | `scoreColor(valor, escala)` | 9 `#34D399` · 8 `#38BDF8` · 7 `#818CF8` · 6 `#F59E0B` · 5 `#F97316` · baixo `#F87171` |

**As duas escalas (não é inconsistência, é regra):** `game` usa **0–100**; as demais mídias usam
**0–10**; temporadas/episódios usam 0–100. `normalizeDisplayScore` + `escalaPorTipo` (em
`src/lib/score-utils.ts`) resolvem isso — a spec da sessão **diz qual escala** aparece e onde.

**Números:** sempre `formatarScoreLocale(valor, locale)` → pt-BR com vírgula e sem ".0" pendurado
(D-602). Interpolar o número cru (ou `toFixed`) é pendência.

## 3. Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Título/display | **Space Grotesk** (`font-heading`) | h1–h3, números grandes de score |
| Corpo | **Inter** (padrão) | texto corrente |
| Números técnicos | **JetBrains Mono** + `tabular-nums` | score, contagem, tabela |

Token `typography.{display,body,bodySmall,caption,label,button,overline,score}` — a sessão cita o
**papel** (ex.: "título de seção usa `heading-lg`") e não o `text-2xl` solto. Cabeçalho institucional
padronizado (D-603): `font-heading text-3xl sm:text-4xl font-bold tracking-tight text-fg-primary mb-8`.

**Medida de leitura:** parágrafo longo ≤ `max-w-[38rem]`; lead ≤ `max-w-[34rem]` (D-603).

## 4. Espaço, raio e elevação

- Espaço: `spacing.{xs,sm,md,lg,xl}` = `0.25 / 0.5 / 0.75 / 1 / 1.5rem`.
- Raio: `radii` (card `rounded-lg`/`xl` conforme o componente; botão `rounded-md`/`lg`) — um raio por
  nível hierárquico, sem misturar na mesma linha.
- Elevação: `elevation.{card,floating,overlay}` — **borda antes de sombra**; sombra só para flutuante
  (`dropdown`, `modal`, `toast`).
- Camadas: `zIndex.{base 0, dropdown 10, sticky 20, drawer 30, modal 40, popover 50, tooltip 60, toast 70}`.

## 5. Movimento

- Duração: `motion.duration` (`fast`/`base`/`slow`) — nenhum valor solto.
- Easing: `motion.easing` + `motion.presets` (entrada, saída, hover).
- Animar `transform` e `opacity`; **nunca** `width/height/top/left`.
- `MotionConfig reducedMotion="user"` no layout do locale (`providers/motion-provider.tsx:18`).
- **Valor que depende de `prefers-reduced-motion` NÃO decide markup** — sem `initial={{opacity:0}}`,
  sem `return null` no render (gate `test/reduced-motion.spec.tsx`, D-587/D-603).

## 6. Densidade e responsivo

- Breakpoints: 375 (mobile), 768 (`md`), 1024 (`lg`), 1440 (desktop de referência).
- Grid de cards do catálogo: 2 colunas em 375, 3 em 768, 5 em 1440 (medido na sessão Catálogo).
- Alvo de toque ≥ 44×44 px no mobile; texto ≥ 14 px (o corpo do produto usa 14–16 px).
- `viewport-fit=cover` está no `<head>` — respeitar safe-area em barras fixas.

## 7. Acessibilidade AA (piso, não meta)

- Um `h1` por página; hierarquia sem pular nível; seções com `h2` **e** landmark (`section` com
  `aria-labelledby`).
- Todo controle focável tem anel de foco visível (`focus.ring`) e ordem de tabulação lógica.
- Ação com resultado assíncrono anuncia em `aria-live` (resultado de filtro, cópia, salvar, erro).
- Contraste: 4,5:1 texto · 3:1 texto grande/ícone — medido por `npm run design:contrast` (221 pares,
  inclui literais no JSX) e pelo axe nas rotas públicas e nas autenticadas (`test:auth`, D-605).
- Ícone sem texto tem `aria-label`; ícone decorativo tem `aria-hidden`.

## 8. Gates que toda sessão deve manter verdes

| Comando | O que trava |
|---|---|
| `npm run design:detect` | anti-padrões de UI (Impeccable, advisory) — hoje 0 |
| `npm run design:contrast` | 221 pares AA (token + literais no JSX) |
| `npm run design:hex` | hex novo fora de token (censo congelado; hoje 135 ocorrências) |
| `npm run test:hydration` | hidratação + conteúdo visível nos 2 modos de movimento (36/36) |
| `npm run test:visual` | pixel do hero (4/4) |
| `npm run test:auth` | axe nas 8 telas de admin + baseline do dashboard (D-605) |
| `npm test` | 624 testes (unit) |
| `npm run design:registries` · `npm run design:figcraft` | registries vivos · tokens no FigCraft |
| `npm run uiux:evidence` | capturas 1440/375 de cada sessão (novo, D-607) |

## 9. Vocabulário de estado (usar sempre estes nomes)

`carregando` · `vazio` · `erro de rede (com retry)` · `não encontrado` · `sem permissão` ·
`dados parciais/desatualizados` · `offline`. Toda spec lista os sete; "não se aplica" exige motivo
(ex.: sessão sem dados de terceiros não tem `dados parciais`).
