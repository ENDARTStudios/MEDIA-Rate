import { Link } from "@/lib/navigation";
import { CategoryIconRow } from "@/components/landing/CategoryIconRow";
import { HeroSourcesMarquee } from "@/components/landing/HeroSourcesMarquee";
import { colors } from "@/lib/design-tokens";
import { ScoreScale, type ScoreScaleLabels } from "./media-rate-ui/ScoreScale";
import { ScoreShowcase, type ScoreShowcaseItem } from "./media-rate-ui/ScoreShowcase";
import { StaticScoreDial } from "./media-rate-ui/StaticScoreDial";

interface HeroSectionProps {
  /** GANCHO — dor/desejo específico do público (H1, elemento de LCP). */
  title: string;
  /** PROMESSA — o que é e qual o ganho, em 1–2 frases. */
  subtitle: string;
  /** CTA secundária → cadastro. */
  cta: string;
  ctaHref: string;
  /** CTA primária → catálogo (menor atrito: catálogo é público). */
  ctaSecondary: string;
  ctaSecondaryHref: string;
  /** Microcopy factual sob as CTAs (ex.: "Sem cadastro para explorar"). */
  ctaHint: string;
  /** Legenda da constelação de categorias. */
  categoriesLabel: string;
  /** Título da faixa de prova (método do score). */
  proofTitle: string;
  proofBody: string;
  criticLabel: string;
  audienceLabel: string;
  consensusLabel: string;
  /** Rótulo de procedência com contagem derivada ({count}). */
  sourcesLabel: string;
  scoreScaleLabels: ScoreScaleLabels;
  /** Obras reais para o ciclo do selo (opcional: sem itens, a vitrine não é montada). */
  scoreShowcaseItems?: ScoreShowcaseItem[];
  /** Rótulo do ciclo, já traduzido. */
  scoreShowcaseLabel?: string;
  /** Texto do campo de busca do hero (o campo é um link para o catálogo). */
  searchLabel?: string;
  /** Rótulo do botão do campo de busca. */
  searchCta?: string;
  /** Obra em destaque no selo do hero — REAL, vinda do catálogo (D-646). */
  topItem?: { titulo: string; tipo: string; score: number; faixa: string };
  /** Nomes REAIS das fontes ativas (FONTES_ATIVAS) — nunca hardcode. */
  sourceNames: string[];
}

const PILLARS = [
  { key: "critic", color: colors.accent.critics },
  { key: "audience", color: colors.accent.audience },
  { key: "consensus", color: colors.accent.indigo },
] as const;

/**
 * Hero da home — funil gancho → promessa → prova → CTA.
 *
 * T405 (server-first): continua SERVER COMPONENT. O H1 (elemento de LCP) pinta
 * como HTML puro; a única ilha client é `CategoryIconRow`, que já existia.
 * Nenhuma imagem acima da dobra (o pôster rotativo saiu em T415/D-333).
 *
 * Redesenho de apresentação (base: `.agents/skills/media-rate-ui-ux/references/
 * hero-playbook.md`):
 * - layout ASSIMÉTRICO (copy + constelação) em vez do trio centralizado
 *   proibido por D-065;
 * - os 6 ícones canônicos ganharam movimento em 3 camadas (CSS module) — o
 *   par ícone+cor de cada categoria não foi alterado;
 * - a faixa de fontes passou a ser DERIVADA (`FONTES_ATIVAS`): antes eram 6
 *   nomes fixos contra um rótulo que dizia "11 fontes" (o valor real é 14);
 * - a prova virou explicação do método (crítica/público/consenso) + lista real
 *   de fontes, em vez de microcopy de baixo contraste;
 * - T474 mantido: catálogo é a CTA primária e o CTA fica acima da dobra.
 * - T087 mantido: nenhuma promessa perpétua de gratuidade.
 * - T209: pill de marca (eyebrow) removido — ver comentário no JSX.
 */
export function HeroSection({
  title,
  subtitle,
  cta,
  ctaHref,
  ctaSecondary,
  ctaSecondaryHref,
  ctaHint,
  categoriesLabel,
  proofTitle,
  proofBody,
  criticLabel,
  audienceLabel,
  consensusLabel,
  sourcesLabel,
  scoreScaleLabels,
  scoreShowcaseItems,
  scoreShowcaseLabel,
  searchLabel,
  searchCta,
  topItem,
  sourceNames,
}: HeroSectionProps) {
  const pillarLabels = {
    critic: criticLabel,
    audience: audienceLabel,
    consensus: consensusLabel,
  };

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      {/* Profundidade discreta (D-065: nada de aurora-blob).
          T211: os dois círculos com `blur-[120px]`/`blur-[110px]` eram a mesma
          família do aurora-blob (e caros em mobile: filtro de blur em 360×520 px);
          trocados por radial-gradients estáticos de alfa baixo. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(129,140,248,0.10)_0%,transparent_62%)]" />
        <div className="absolute -right-24 top-[6%] h-[360px] w-[360px] bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.07)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-1/2 h-[280px] w-[520px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.07)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Coluna 1 — GANCHO + PROMESSA + AÇÃO */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* T209: o pill de marca acima do H1 foi REMOVIDO. Ele era o padrão
                "eyebrow chip + headline gigante" (achado `hero-eyebrow-chip` do
                detector de DOM renderizado), a D-065 já proíbe o trio
                centralizado de que ele fazia parte, e "MEDIA Score™" já aparece
                duas vezes dentro do hero (hub da constelação e faixa de prova).
                Efeito: H1 ~46px mais alto na dobra e zero texto decorativo. */}
            <h1
              id="hero-title"
              className="max-w-[22ch] font-heading text-4xl font-bold leading-[1.05] tracking-tight text-fg-primary [text-wrap:balance] sm:text-5xl lg:max-w-[18ch] lg:text-[3.4rem]"
            >
              {title}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-secondary sm:text-lg">
              {subtitle}
            </p>

            {/* T474: catálogo é a CTA primária (catálogo é público; cadastro
                exige mais atrito). Pesos visuais bem separados de propósito. */}
            <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <Link
                href={ctaSecondaryHref}
                data-hero-cta="primary"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-8 py-3.5 text-sm font-semibold text-brand-foreground transition-[filter] duration-200 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {ctaSecondary}
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <Link
                href={ctaHref}
                data-hero-cta="secondary"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border px-8 py-3.5 text-sm font-semibold text-fg-primary transition-colors duration-200 hover:bg-surface-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
              >
                {cta}
              </Link>
            </div>

            <p className="mt-4 text-xs text-fg-muted">{ctaHint}</p>

            {/* D-646: o campo de busca do conceito. É um LINK para o catálogo (a busca real vive
                lá e a paleta ⌘K já cobre o atalho): visualmente é o campo do desenho, sem inventar
                um segundo mecanismo de busca que não teria backend próprio. */}
            {searchLabel && (
              <Link
                href={ctaSecondaryHref}
                data-hero-search=""
                className="mt-7 flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-card px-5 py-3.5 text-left transition-colors hover:border-accent-indigo"
              >
                <span className="truncate text-sm text-fg-muted sm:text-base">{searchLabel}</span>
                <span className="shrink-0 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-brand-foreground">
                  {searchCta}
                </span>
              </Link>
            )}
          </div>

          {/* Coluna 2 — âncora visual: as 6 categorias em constelação */}
          {/* D-646: o selo do hero. Dial ESTÁTICO (server, sem timer) com a obra de melhor nota que o
              catálogo devolveu — o número é o do cálculo, com a faixa ao lado (D-583.4). O ciclo
              animado continua na faixa de prova, junto da régua, onde a sincronia acontece. */}

          {topItem && (
            <div className="flex flex-col items-center gap-4 lg:items-start">
              <StaticScoreDial value={topItem.score} size="lg" />

              <div className="text-center lg:text-left">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-muted">
                  {topItem.tipo}
                </p>

                <p className="mt-1 max-w-[22ch] font-heading text-base font-semibold text-fg-primary">
                  {topItem.titulo}
                </p>

                <p className="mt-1 text-sm text-fg-secondary">{topItem.faixa}</p>

                {scoreShowcaseLabel && (
                  <p className="mt-1 text-[11px] text-fg-muted">{scoreShowcaseLabel}</p>
                )}

                {/* As fontes que alimentam o número são as MESMAS da faixa de prova (FONTES_ATIVAS),


                    não uma lista digitada à mão. */}

                <ul className="mt-3 flex flex-wrap gap-2" role="list">
                  {sourceNames.slice(0, 3).map((nome) => (
                    <li
                      key={nome}

                      className="rounded-lg border border-surface-border bg-surface-card px-2.5 py-1 text-[11px] text-fg-secondary"
                    >
                      {nome}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-5 lg:col-span-2">
            {/* D-644: os 6 ícones como elemento PRIMÁRIO, centralizados, com o efeito Dock sob o
              ponteiro. A forma orbital continua existindo no componente (variant="orbit"). */}
            <CategoryIconRow variant="row" />
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-fg-muted">
              {categoriesLabel}
            </p>
          </div>
        </div>

        {/* Prova — método do score + fontes REAIS que o alimentam */}
        <div className="mt-12 border-t border-[rgba(129,140,248,0.10)] pt-8 lg:mt-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.22em] text-fg-secondary">
              {proofTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{proofBody}</p>
            <ul
              className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-3"
              role="list"
            >
              {PILLARS.map((pillar) => (
                <li
                  key={pillar.key}
                  className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-fg-secondary"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: pillar.color }}
                    aria-hidden="true"
                  />
                  {pillarLabels[pillar.key]}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-center text-xs text-fg-muted">{sourcesLabel}</p>
          {/* D-642: a régua entra na faixa de prova — a seção já é a do método, e
              a escala é a visualização dele. `ativa` fica pronto para o ciclo do selo. */}
          {/* D-643: o selo percorre as seis faixas (obras reais) e acende a faixa
              correspondente na régua — que segue server component, passada como filho. */}
          {scoreShowcaseItems && scoreShowcaseItems.length > 0 && (
            <ScoreShowcase
              items={scoreShowcaseItems}
              label={scoreShowcaseLabel ?? ""}
              className="mx-auto mt-8 max-w-3xl"
            >
              <ScoreScale labels={scoreScaleLabels} />
            </ScoreShowcase>
          )}
          {(!scoreShowcaseItems || scoreShowcaseItems.length === 0) && (
            <ScoreScale labels={scoreScaleLabels} className="mt-8" />
          )}
          <div className="mt-3">
            <HeroSourcesMarquee names={sourceNames} />
          </div>
        </div>
      </div>
    </section>
  );
}
