# T405 — tabela cumulativa Lighthouse (home) + leitura final (lote b)

Metodologia (D-398): Lighthouse headless, mobile, só performance, contra a home
(`mediarate.app`). Alta variância documentada (cache/CDN/warm-up dominam LCP).

## Tabela cumulativa (home)

| reporte | perf | LCP (ms) | FCP (ms) | TBT (ms) | TTI (ms) | main-thread (ms) | SI (ms) |
|---|---|---|---|---|---|---|---|
| lote-f15-home | 65 | 10302 | — | 357 | 11384 | 4653 | 3922 |
| lote-f15-hero | 57 | 8659 | — | 491 | 11521 | 4904 | 5892 |
| lote-f15-hero2 | 67 | 10397 | — | 290 | 10964 | 4341 | 4120 |
| lote-f15-u2u3 (lote a) | 60 | 10183 | 2735 | 515 | 11315 | 8122 | 4162 |
| **lote-f15-b (lote b)** | **63** | 10037 | **1252** | 441 | 11043 | **4518** | **3691** |

## Leitura honesta (lote b)

- **JS reduziu de fato**: `unused-javascript` caiu **129 KiB → 52 KiB** e
  **FCP 2735 → 1252 ms** após tornar ContinueDecision/BecauseYouConsumed server
  (cookie `sess`, null p/ anônimo) e MotionFooter estático (sem motion).
- **main-thread ~4,5 s** (estável; o 8,2 s do lote a foi ruído de CDN/cold).
- **TBT estável** (441 ms) e **bootup 2533 → 2320 ms**.

## Meta vs. resultado

- Meta (D-398): perf ≥75, TTI <5 s, main-thread <4 s.
- Resultado final: **perf 63, TTI ~11 s, main-thread ~4,5 s** — **NÃO atingido**.
- **Residual real (não é JS nem CDN de pôster):** FCP pinta em 1,25 s, mas o LCP
  (o H1 do hero, texto) só é contabilizado em ~10 s — lacuna de ~8,8 s em um
  elemento de TEXTO server-renderizado, sem correlação com TBT (441 ms),
  main-thread (4,5 s) ou imagem (hero é texto). Hipótese: swap de fonte
  (`font-heading`) re-pinta o H1 tarde / quirk de medição do Lighthouse.
  Candidato a investigação dedicada na F16 (render/font), fora do escopo JS.
