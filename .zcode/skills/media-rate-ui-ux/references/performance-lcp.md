# Server-first, LCP, CLS e hidratação

## Regra central (D-380 / T405)

O elemento do **LCP na home é o H1 do hero** (texto). Portanto:

1. H1, subtítulo, CTAs, tiles de categoria e provas **saem no HTML do
   servidor** — `HeroSection` é Server Component por decisão (T405).
2. **Nenhuma imagem nova acima da dobra.** Histórico: a `ScoreShowcase`
   (pôster `next/image` rotativo) piorou o LCP — foi removida do hero em
   T415/D-333; `HomeStats` e carrosséis ficam abaixo da dobra.
3. **Entrada animada é CSS puro** (keyframes + `animation-delay` em função de um
   índice) ou ilha client mínima — nunca animação que dependa de hidratar o
   texto do LCP.
4. Ilhas client permitidas acima da dobra: as que já existiam (ex.:
   `CategoryIconRow`, que troca o rótulo por locale). Elas **não** podem
   atrasar o primeiro paint do H1.

## Orçamento prático

- JS de ilha acima da dobra: manter pequeno; sem lib de animação nova no
  primeiro load quando CSS resolve (a hero atual usa CSS + `requestAnimationFrame`
  cru, sem `motion`/GSAP).
- GSAP/`motion`/animejs já estão no `package.json` — mas `gsap` é lazy-loaded
  (`ScrollReveal`) justamente para não entrar no bundle inicial.
- Imagens: `next/image` com `sizes` explícito e `fetchPriority` correto;
  pôsteres de card abaixo da dobra.
- `revalidate = 3600` (ISR horária) na home — não force `dynamic`.

## CLS

- Reserve espaço: `aspect-ratio`, `width`/`height` explícitos, largura fixa de
  tiles (`--tile`) e labels **posicionados fora do fluxo** (absolute) para não
  empurrar o layout quando o texto muda de locale.
- Anime apenas `transform`, `opacity`, `filter` — nunca `top/left/width/height`.
- Proibido: skeleton que troca de altura ao hidratar; fonte diferente entre
  SSR e cliente (usar `next/font`).

## a11y AA (gate real)

`apps/web/e2e/a11y.spec.ts` roda axe (`wcag2a`, `wcag2aa`) em `/pt-BR` e exige
**0 violações** (`E2E_FULL=1` + stack local). Regras que mais quebram visual novo:

- `color-contrast` (rodar o contrast-audit antes do PR).
- `aria-label`/`alt` ausente em elemento informativo.
- `role="list"` explícito quando `list-style: none` é aplicado (Safari remove a
  semântica de lista).
- Botões decorativos (ex.: indicadores de carrossel) precisam de
  `aria-hidden` + `tabIndex={-1}` ou nome acessível.

## Como medir rápido

`visual-qa/scripts/visual-qa.mjs` checa overflow horizontal, altura dos
elementos acima da dobra e coleta `performance` básica. Para LCP/CLS reais usar
Lighthouse/WebPageTest em produção (Vercel) — a métrica local com `next dev`
não representa produção.
