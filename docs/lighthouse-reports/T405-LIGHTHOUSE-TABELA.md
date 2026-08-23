# T405 — tabela cumulativa Lighthouse (home) + leitura U2/U3

Metodologia (D-398): Lighthouse headless, mobile, só performance, contra a
home. Alta variância documentada (cache/CDN, warm-up do next/image e estado
da implantação dominam LCP/TTI/main-thread muito mais que o bundle JS).

## Tabela cumulativa (home)

| reporte | perf | LCP (ms) | TBT (ms) | TTI (ms) | main-thread (ms) | SI (ms) |
|---|---|---|---|---|---|---|
| lote-f15-home | 65 | 10302 | 357 | 11384 | 4653 | 3922 |
| lote-f15-hero | 57 | 8659 | 491 | 11521 | 4904 | 5892 |
| lote-f15-hero2 | 67 | 10397 | 290 | 10964 | 4341 | 4120 |
| **lote-f15-u2u3 (U2/U3)** | 60 | 10183 | 515 | 11315 | 8122 | 4162 |

## Leitura honesta (não métrica de vaidade)

- **TBT (bloqueio de JS) estável**: 515 ms vs 290–491 ms nos passos anteriores.
  Sem regressão de bloqueio — coerente com a prova de bundle (motion/zustand/
  ilhas antigas fora do caminho crítico da home).
- **perf / LCP / main-thread ruidosos**: `mediarate.app` (CDN quente) mediu
  perf 60 / main-thread 8,2 s; a preview crua (cold) mediu perf 46–47 /
  main-thread 10,8–12,7 s. O LCP ~9,9 s é dominado por imagem (poster/capa),
  não por JS — mesmo problema apontado na auditoria (LCP 9,1 s).
- **Meta (perf ≥75, TTI <5 s, main-thread <4 s) NÃO atingida.** A causa
  dominante do LCP é o carregamento/otimização de imagem (next/image), fora do
  escopo U2/U3 (que atacou hidratação). Próxima proposta calibrada: priorizar
  imagens acima da dobra (fetchpriority/LCP) em vez de mexer mais no JS.

## Evidências

- `docs/lighthouse-reports/lote-f15-u2u3-home.json` (produção `mediarate.app`).
- Prova de bundle U2/U3: `docs/T405-U3-BUNDLE-PROVA.md`.
