# F16 — diagnóstico do LCP da home (Issue #17)

Data: 2026-08 · Escopo: SPRINT.md (Issue #17). Método: Playwright com emulação
Lighthouse (Slow 4G + 4× CPU) + Lighthouse real. Evidência em timestamps.

## Hipótese de entrada (D-402) — REFUTADA

"Swap da fonte (`font-heading`/Space_Grotesk) re-pinta o H1 tarde."

**Refutada pela medição:** sob throttle, as fontes terminam de baixar em
2,3–6,0 s e o `font-family` do H1 já é "Space Grotesk" aos **2,5 s** — mas o
LCP do H1 só disparava aos **12,6 s**. A fonte não era a causa.

## Causa raiz real — PageTransition escondia o conteúdo no SSR

`apps/web/src/components/PageTransition.tsx` renderizava TODA a página dentro
de `<motion.div initial={{ opacity: 0 }}>` — o HTML server-renderizado saía com
`style="opacity:0"`, ou seja, o **H1 (LCP) ficava invisível até a hidratação +
fade-in concluírem** (~10–12 s sob o throttle do Lighthouse). Em condições reais
(sem throttle) o fade-in termina em ~1,3 s — por isso o LCP real era 1,3 s e o
Lighthouse marcava 10 s.

Evidência do SSR (antes): `<div data-testid="page-transition" style="opacity:0">…`

## Correção (T2 — causa raiz)

- Primeiro paint: conteúdo **visível** (sem wrapper de opacidade).
- Após hidratação, navegações client-side mantêm o fade-in curto
  (`initial={opacity:0}` só para pathname novo); rota inicial nunca esconde.
- `prefers-reduced-motion` continua com render direto.

Teste: `apps/web/test/page-transition.spec.tsx` (SSR nunca contém `opacity:0`) —
falhou antes da correção (prova o bug), passa depois.

## Medição antes/depois

| Métrica | Antes (produção) | Depois (preview) | Depois (produção) |
|---|---|---|---|
| LCP (Lighthouse, mobile) | 10.037 ms | 4.068 ms | **3.425 ms (−66%)** |
| perf | 63 | 67 | **73** |
| LCP (Playwright throttled) | 12.628 ms | 4.236 ms | — |
| LCP (Playwright real, sem throttle) | 1.324 ms | — | — |

## Residual honesto (secundário, documentado)

Após a correção, o LCP ~4,1 s sob throttle coincide com o **swap da fonte**
(fonte chega em ~4,2 s sob Slow 4G; em rede real chega em ~0,5 s). O primeiro
paint já é visível com a fonte de fallback (métricas ajustadas, sem CLS). Para
reduzir mais: pré-carregar as fontes críticas (preload) — candidato a follow-up
(não entrou neste sprint: URLs de fonte são hasheadas por build).
