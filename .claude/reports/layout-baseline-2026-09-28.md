# Baseline de layout — BETA-GAP-13 / BETA-GAP-14 (2026-09-28)

## BETA-GAP-13 — Planos (CTAs alinhados) — **GREEN**
- **Evidência CI:** run `36340154322` (CI) · job `108678561019` (`E2E Full (jornada crítica 3x)`, conclusion **success**) · **step 15 `Medição de layout (BETA-GAP-13/14)` = `completed/success`** no head **`565750be`**.
- **Jornada crítica:** `48 passed` (sem regressão).
- **Tolerância usada:** **1px** (preferencial; não foi necessário 2px).
- **Causa raiz histórica (corrigida):** `LAYOUT_REAL_MISMATCH` — `y do CTA 1 difere do 0 (660 vs 683)` = **23px** (rodapés de altura variável empurravam o CTA).
- **Correção:** `PricingCards.tsx` — avisos/rodapés **antes** do CTA e **CTA como último elemento** do card → `y_CTA = base_do_card − padding − altura` (idêntico nos 3 cards, que compartilham altura via `items-stretch`).
- **Asserções que passaram (por construção):** desktop 1280x800 (pt-BR/en-US/es-ES) y e altura dos 3 CTAs iguais ±1px; altura dos 3 cards igual ±1px. Mobile 390x844: offset base-card/base-CTA idêntico ±1px; CTA ≥40px.
- **PR:** #303 (merge commit). **Observação:** as `annotations` do Playwright não aparecem no log do job; os **números por locale** ficam recuperáveis com um `console.log` JSON sanitizado (follow-up trivial, não bloqueante — o gate autoritativo foi o **step = success**).

## BETA-GAP-14 — Biblioteca (densidade) — **GREEN (T125)**
- **Evidência autoritativa do STEP:** run `36458375633` / job `109050493741` → step **`Densidade da Biblioteca (BETA-GAP-14)` = `completed/success`** no head **`4be78b8f`** (4 passed).
- **`density_mode = contract_mock`** — `page.route` intercepta `GET /api/v1/interacoes` e serve o envelope real `{ items, total, porStatus, nextCursor }` com **8 itens QUERO_CONSUMIR**; o teste **prova o consumo** afirmando `Fixture Biblioteca 01` visível (não é falso verde).
- **Números reais (chromium e mobile-chrome):**
  - desktop **1280×800** → `display=grid`, **`columns=6`**, **`overflowX=false`**, `cards=8`, card `203×391`.
  - mobile **390×844** → `display=grid`, **`columns=2`**, **`overflowX=false`**, `cards=8`, card `189×369`.
- **Causa raiz do overflow (corrigida):** o brilho decorativo do `MediaCard` usava `absolute -inset-1` (caixa 4px maior que o card) → bleed para fora do grid → `scrollWidth > clientWidth`. Fix: `absolute inset-0` (o glow continua via `box-shadow`, que não conta no layout).
- **Produto:** grid `grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7` (`BibliotecaClient.tsx`).
- **PR:** #324 (merge commit `7ea5e574`). Required + E2E + Vercel verdes; smoke 7/7.
