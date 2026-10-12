# Hero / Home — contrato de design

Arquivos:

| Peça | Arquivo |
|---|---|
| Seção (Server Component) | `apps/web/src/components/HeroSection.tsx` |
| Constelação de categorias (ilha client) | `apps/web/src/components/landing/CategoryIconRow.tsx` |
| CSS de movimento da constelação | `apps/web/src/components/landing/category-orbit.module.css` |
| Faixa de fontes (Server, CSS puro) | `apps/web/src/components/landing/HeroSourcesMarquee.tsx` |
| Montagem + dados | `apps/web/src/app/[locale]/page.tsx` |
| Copy | `landing.*` e `scoredial.*` em `src/messages/*.json` |

## Estrutura (ordem do DOM = ordem de leitura)

```
<section aria-labelledby="hero-title">
  [camadas decorativas : aria-hidden]
  grid  lg:[copy | constelação]
    ESQUERDA (Server)
      H1  #hero-title      landing.hero              ← GANCHO (LCP, 1º elemento)
      subtítulo            landing.heroSubtitle      ← PROMESSA
      CTA primária         landing.ctaSecondary  → /catalog   (rose, dominante)
      CTA secundária       landing.cta         → /register (outline)
      microcopy factual    landing.ctaHint
    DIREITA
      <CategoryIconRow />  6 ícones canônicos animados
      legenda              landing.categoriesLabel
  faixa de prova (largura total, borda superior)
      provaTitle + proofBody                        ← PROVA (método)
      3 pills: scoredial.critic / audience / consensus
      sourcesLabel (com {count} derivado) + marquee das fontes reais
</section>
```

Regras de layout:

- **Assimétrico** (copy à esquerda, âncora visual à direita) — a "hero trio
  centralizado" é proibida por D-065.
- Mobile: coluna única, copy centralizada, constelação vira grade 3×2.
- Sem imagem acima da dobra (protege o LCP).
- Fundo: radiais discretos (≤ 8% de alfa) sobre o `LayeredBackground`; nenhum
  blob gigante desfocado.
- **Sem chip/eyebrow acima do H1 (T209).** O pill de marca é o padrão
  `hero-eyebrow-chip` (detector de DOM renderizado) e não tem função: o gancho
  deve ser o primeiro elemento lido. Neste hero o wordmark já aparece no hub da
  constelação e em `sourcesLabel`. Guarda: `test/hero-constellation.spec.tsx`
  (T209) exige `previousElementSibling === null` no H1.

## Constelação de categorias (o item animado)

Geometria (≥ 1024 px): 6 tiles de 84 px distribuídos a 60° num anel de raio
~148 px, ao redor de um "hub" decorativo com o wordmark `MEDIA Score™`.
`--a` (ângulo) e `--i` (índice) por item; `--r` e `--tile` no stage.

Ordem canônica: `movie, series, game, book, comic, manga`
(`CATEGORY_TOKENS`) — os 6 pares ícone+cor são imutáveis.

### Camadas de movimento (3 obrigatórias — `motion-design`)

| Camada | O quê | Como |
|---|---|---|
| Primária | entrada em cascata | `iconIn` no `<a>`: opacity 0→1, `translateY(16px)→0`, `scale(.62)→1`, `blur(6px)→0`, 720 ms, `cubic-bezier(0.22,1,0.36,1)`, `delay = var(--i) * 80ms` (total 400 ms + 720 ms < 1,2 s) |
| Secundária | flutuação ambiente + glow | `iconFloat` (`translateY 0→-6px→0`, 4,6 s, fase `var(--i) * -0.77s`) numa camada interna; glow pulsa `opacity .22→.5` em `::after` com `filter: blur()` |
| Ambiente | anel orbital | anel tracejado + arco cônico girando 28 s linear; pulso radial 6 s |

Interação:

- hover/focus: tile sobe 7 px, `scale(1.06)`, borda/fundo na cor da categoria,
  `box-shadow` colorido; label vai a 100% de opacidade.
- **staging** (1/3 rule): com um tile em hover/focus, os irmãos caem para
  `opacity .5` + `saturate(.65)` via `:has()`.
- parallax de ponteiro: `--tx`/`--ty` no stage (±6°) via `requestAnimationFrame`
  apenas com `(min-width: 1024px) and (pointer: fine)` e sem reduced-motion.
- `prefers-reduced-motion`: entrada, loop, glow, giro e parallax desligados —
  os 6 tiles ficam visíveis e estáticos (`opacity: 1` garantido).

Não-objetivos: nada de rotação dos ícones junto com o anel (alvo móvel prejudica
o clique); nada de `scale` no hover acima de 1.08; nada de loop com amplitude
> 8 px.

### A11y da constelação

- `<nav aria-label={catalog.catalogAria}>` em volta de `<ul role="list">`.
- Cada tile é `<Link href="/catalog?type=X">` com `aria-label` do tipo.
- Partes decorativas (`anel`, `hub`, `glow`) com `aria-hidden="true"`.
- Foco visível: outline global índigo 2 px + o mesmo realce visual do hover.
- Ícones com `strokeWidth 1.6` e `h-10 w-10` (legibilidade em 84 px).

## Verdade dos números

- `NUM_FONTES_ATIVAS` e `FONTES_ATIVAS` (`@/lib/sources`) são a ÚNICA fonte da
  contagem e dos nomes de fontes — `sourcesLabel` usa `{count}` e o marquee
  renderiza a lista real (hoje 14 fontes). Nunca volte a digitar "11 fontes"
  nem uma lista fixa de 6 nomes.
- `HomeStats` (abaixo da dobra) segue dona dos números de catálogo/categorias.

## Testes que protegem este contrato

- `apps/web/test/hero-constellation.spec.tsx` — ordem do funil, presença dos 6
  tipos, ausência de número hardcoded, ausência de promessa perpétua.
- `apps/web/test/hero-promessa-perpetua.spec.ts` — T087.
- `apps/web/test/home-truthfulness.spec.ts` — sem "em breve" no hero.
- `apps/web/test/contrast-aa.spec.ts` — cores canônicas AA.
- `apps/web/e2e/a11y.spec.ts` — axe AA na home (`E2E_FULL=1`).
- `apps/web/e2e/flow.spec.ts` — mantém `#hero-title` (não renomear o id).
