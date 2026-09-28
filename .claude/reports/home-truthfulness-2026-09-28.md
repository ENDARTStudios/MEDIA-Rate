# BETA-GAP-05 / T121 — Home truthfulness (matriz de verdade + correções)

**Data:** 2026-09-28 · **Branch:** `feat/t121-beta-gap-05-home-truthfulness` (de `origin/main` `4833c346`)
**Regra:** home não é wishlist — só afirma o que existe no `main`.

## 1. Mapa da home (componentes reais)

`apps/web/src/app/[locale]/page.tsx` compõe, de cima para baixo:
`HeroSection` · `HomeStats` · `ContinueDecision` (só logado) · `BecauseYouConsumed`
(só logado) · 6× `MediaCarousel` (movie/series/game/book/comic/manga) · CTA final
(`/register`) · `HomeContentSections` (H2 + FAQ, PT/EN/ES).

## 2. Matriz de verdade (links e CTAs internos)

| secao | elemento | href/acao | status | evidencia |
|---|---|---|---|---|
| hero | CTA primária | `/catalog` | IMPLEMENTED | rota existe; smoke `/pt-BR/catalog` 200 |
| hero | CTA secundária | `/register` | IMPLEMENTED | rota existe |
| hero | tiles de categoria | `/catalog?type={tipo}` | IMPLEMENTED | `CategoryIconRow.tsx:28`; rota `/catalog` |
| stats | contadores | catálogo real + `NUM_FONTES_ATIVAS` + 6 categorias | IMPLEMENTED | `HomeStats.tsx`; `lib/sources.ts` (14 fontes) |
| carrosséis | cards | `/media/{id}` | IMPLEMENTED | rota `/media/[id]`; dados SSR `getCatalog` |
| continuar decisão | (só logado) | `/media/{id}` | AUTH_GATED | `ContinueDecision.tsx` (retorna null p/ visitante) |
| because-you-consumed | (só logado) | recomendações | AUTH_GATED | server component; vazio p/ visitante |
| CTA final | botão | `/register` | IMPLEMENTED | rota existe |
| content: privacidade | link | `/privacy` | IMPLEMENTED | rota existe |
| content: idiomas | links | `/` (pt-BR/en-US/es-ES) | IMPLEMENTED | rotas de locale |
| content: FAQ CTA | link | `/pricing#faq` | IMPLEMENTED | rota `/pricing` (smoke 200) |
| hero | rótulo de fontes | "agrega 14 fontes" | IMPLEMENTED | igual a `NUM_FONTES_ATIVAS` (14) |

**Links quebrados:** nenhum (todas as rotas existem em `apps/web/src/app/[locale]/*`).

## 3. Achado corrigido — alegação de escala do score (MISLEADING)

`homeContent.faq1A` e `pricingFaq.faq1A` afirmavam **"mangás de 0 a 100"**
(en: "games and manga 0-100"; es: "juegos y mangas de 0 a 100"). O BETA-GAP-09
(DONE) implementou `manga = 0–10` (`apps/web/src/lib/score-utils.ts:4-8`:
game 0–100; demais mídias, incl. manga, 0–10). ⇒ Copy contrária ao produto.

**Correção (3 locales):** "jogos de 0 a 100; demais mídias — filmes, séries,
livros, HQs e mangás — de 0 a 10" (EN/ES equivalentes).

## 4. Itens auditados e mantidos (IMPLEMENTED / PLAN_GATED)

- `plansCompareBody` (Free/Plus/Premium + preços via `formatPlanPrice`) — confere
  com `/pricing`; recurso pago descrito como pago (não promete acesso Free).
- `catalogDetailBody` ("sinopse, elenco, …") — seções existem com estados
  honestos de indisponibilidade (`catalog.castUnavailable`, `noReviews`) →
  **PARTIAL**; aprofundamento é escopo do **BETA-GAP-06** (follow-up, não desta).
- `landing.feature1..3` — **não renderizados** na home (sem uso) → sem promessa.
- `auth.socialComingSoon`/`socialIntegrating` ("Login social em breve") — chaves
  **não usadas** em componente algum (o botão Google é real) → sem promessa falsa.
- "assistente (em breve)" em FAQ — marcado como futuro, fora de CTA primário →
  aceitável pela política; permanece.

## 5. Teste de regressão

- `apps/web/test/home-truthfulness.spec.ts` (unit, roda no CI required):
  - nenhuma string afirma manga em 0–100;
  - FAQ home/planos afirma a escala correta;
  - CTAs/hero primários sem "em breve/coming soon";
  - paridade de chaves `home`/`homeContent`/`landing`/`pricingFaq` ×3 locales.
- `apps/web/e2e/home-truthfulness.spec.ts` (E2E): links internos resolvem < 400,
  sem chave i18n crua, sem 5xx, sem alegação de escala errada nos 3 locales.
- **Vermelho evidenciado:** regex no copy de `HEAD` acusa a alegação errada nos
  3 locales; verde após a correção (unit 4/4).

## 6. PR / merge / smoke (preenchido após merge)

- Commit: `(a preencher)` · PR: `(a preencher)` · merge: `(a preencher)`
- Required: `(a preencher)` · `123ce28e`: `(a preencher)` · Smoke 7/7: `(a preencher)`
