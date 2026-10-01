# UG-13 — Evidência de fechamento: CTAs de planos alinhados

**Data (UTC):** 2026-10-01 · **Método:** Playwright real contra https://mediarate.app/en-US/pricing
(medição de `getBoundingClientRect()` dos 3 CTAs via `[data-testid="plan-cta-*"]`).

## Medições

**Desktop 1280×720** — os 3 CTAs na MESMA linha-y (859), mesmo tamanho (298×40):

| CTA | x | y | w | h |
|---|---:|---:|---:|---:|
| free | 118 | 859 | 298 | 40 |
| plus | 488 | **859** | 298 | 40 |
| premium | 859 | **859** | 298 | 40 |

**Mobile 375×720** (coluna única) — consistência dentro de cada card (x=41, w=289, h=40):
free y=828 · plus y=1424 · premium y=2006 (um por card, sem sobreposição/deslocamento).

## Conclusão

**UG-13 RESOLVIDO** — o fix BETA-GAP-13 já em produção (container `mt-auto` com altura
mínima reservada, PricingCards.tsx ~L226) alinha os CTAs nos 3 cards. A medida histórica
"Plus top=847 vs 851 (4px)" (T146/audit 2026-09-30) não se reproduz mais.

Nenhuma alteração de código necessitada para este item; evidência desta medição.
