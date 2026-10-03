# @media-rate/web

Frontend Next.js 16 do MEDIA Rate — App Router, Turbopack, next-intl v4 (pt-BR/en-US/es-ES), React Server Components. Deploy automático na **Vercel** (push em `main`).

## Comandos (da raiz do monorepo)

```bash
npm run dev -w apps/web        # desenvolvimento (:3000)
npm run build -w apps/web      # build de produção
npm run start -w apps/web      # serve o build
npm run test -w apps/web       # Vitest (unit/component, guard i18n de paridade)
npx playwright test            # E2E (a partir de apps/web; ver e2e/README.md)
```

## Ambiente

```bash
cp apps/web/.env.example apps/web/.env.local   # apenas variáveis NEXT_PUBLIC_* (públicas)
```

O frontend **nunca** carrega segredos de backend — princípio do menor privilégio (T204). A API é consumida via `NEXT_PUBLIC_API_URL`.

## Estrutura principal

- `src/app/[locale]/` — rotas por locale (catálogo, ficha de mídia, biblioteca, dashboard, pricing…)
- `src/components/` — componentes (exibição de notas sempre via `src/lib/score-utils.ts` — política BETA-GAP-09/T147)
- `src/messages/{pt-BR,en-US,es-ES}.json` — i18n com **paridade obrigatória** de chaves (guard no CI, D-210)
- `src/lib/` — engine de score, score-utils (escala/exibição), http, imagem
- `e2e/` — Playwright (allowlist web-only no CI; specs dirigidas "live" documentadas em TESTING.md)
- `workers/` — workers Cloudflare (S0/mídia, R2)

## Convenções

- Notas: games 0–100; demais (incl. mangá) 0–10; **sem arredondamento** na exibição (trunca 1 casa) — use o pipeline de `score-utils`.
- Rotas canônicas de smoke: `/pt-BR/catalog` (nunca `/catalogo`).
- Qualquer mudança passa pelo fluxo PR→merge do [`AGENTS.md`](../../AGENTS.md) — CI com Docs Gate, lint, testes e Vercel preview.
