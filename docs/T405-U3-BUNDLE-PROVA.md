# T405 · U3 — prova de bundle (event delegation no carrossel)

Data: sessão T405 (D-399). Ferramenta: manifestos de build do Next.js
(equivalente ao @next/bundle-analyzer no nível de grafo de chunks — o
`@next/bundle-analyzer` não foi instalado: o install foi bloqueado pela
política `EALLOWSCRIPTS` do repo).

## O que foi removido (U3)

- `apps/web/src/components/media-rate-ui/CardIslands.tsx` (60 ilhas/card).
- `apps/web/src/components/media-rate-ui/LazyMount.tsx` (IntersectionObserver
  por card).

## O que substituiu (U2)

- `MediaCardShell` renderiza 2 botões ESTÁTICOS (`data-card-action="watchlist"`
  e `data-card-action="status"`, `data-media-id`, `data-media-type`).
- `CarouselInteractions` = UMA ilha de event delegation + UM popover
  (focus trap/Esc/aria-expanded), cross-prompt inline, 401→/login, coração
  inicial via cookie `mediarate_watchlist`. Sem zustand/motion.

## Evidência (build de produção, apps/web)

Home `/[locale]` — `.next/server/app/[locale]/page_client-reference-manifest.js`:

| módulo (client boundary) | antes (U1) | depois (U3) |
|--------------------------|------------|-------------|
| `CarouselInteractions`    | ausente    | **presente** |
| `CardIslands`            | presente   | **ausente**  |
| `LazyMount`              | presente   | **ausente**  |
| `WatchlistButton`        | dinâmico   | **ausente**  |
| `StatusReactionControl`  | dinâmico   | **ausente**  |
| `motion` / `zustand`    | (via ilhas)| **ausente** (sem import pela ilha) |

Home `/[locale]` — `.next/server/app/[locale]/page/react-loadable-manifest.json`:

- 0 chunks `next/dynamic` para `WatchlistButton`/`StatusReactionControl`
  (antes: 2 chunks lazy por tipo de card).

Resultado: o carrossel da home deixou de hidratar 60 ilhas (zustand+motion) e
passou a 1 ilha (`CarouselInteractions`), com a interação delegada por
`data-*`.

## Verificação

- `tsc --noEmit` web: 0 erros.
- `eslint` (media-rate-ui + bridge): 0 erros.
- `next build`: 98/98 páginas geradas.
- `vitest test/media-card-shell-static.spec.tsx`: 3/3 (botões `data-*` no shell).
