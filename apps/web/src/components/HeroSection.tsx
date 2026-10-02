import { Link } from "@/lib/navigation";
import { CategoryIconRow } from "@/components/landing/CategoryIconRow";

interface HeroSectionProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  ctaSecondary: string;
  ctaSecondaryHref: string;
  /** T474: rótulo de procedência que qualifica a faixa de fontes (ex.:
   *  "MEDIA Score™ agrega 14 fontes de avaliação"). */
  sourcesLabel: string;
}

const SOURCES_STRIP = ["IMDb", "Rotten Tomatoes", "TMDB", "Metacritic", "IGDB", "OpenCritic"];

/**
 * T415: ScoreShowcase removido; tiles navegam para a categoria.
 * T405 (server-first): hero vira SERVER COMPONENT — sem framer-motion de
 * entrada (removido o fade-in/stagger). O conteúdo do LCP pinta imediatamente
 * como HTML puro, sem hidratar motion. CategoryIconRow segue como ilha client.
 * T474: compressão vertical + CTA primária = catálogo + tiles sobem acima dos
 * CTAs + contraste AA na microcopy. Tudo espaçamento/copy/ordem — a hero
 * continua server-first e LCP-neutra (D-380 intacto).
 * T087: microcopy de confiança REMOVIDA. A frase "grátis para sempre"
 * (en: "free forever", es: "gratis para siempre") era uma promessa perpétua de
 * gratuidade — oferta vinculante de prazo indeterminado (CDC art. 30), que
 * impediria qualquer mudança futura de monetização do plano Free. A remoção
 * melhora o LCP (menos um nó de texto) e não reintroduz conteúdo na dobra.
 */
export function HeroSection({
  eyebrow,
  title,
  subtitle,
  cta,
  ctaHref,
  ctaSecondary,
  ctaSecondaryHref,
  sourcesLabel,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      {/* Camadas de gradiente radial + glow rose (D-333) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.08)_0%,transparent_55%)]" />
        <div className="absolute left-1/2 top-1/4 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E11D48] opacity-[0.05] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 h-[360px] w-[360px] rounded-full bg-[#818CF8] opacity-[0.04] blur-[110px]" />
      </div>

      {/* T474: compressão vertical — o CTA primário e os tiles de categoria
          precisam caber acima da dobra em viewports de 1366×768 e notebooks
          com barra do browser (LCP-neutro: só espaçamento, zero JS/imagem). */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-10 pt-10 text-center sm:px-6 lg:px-8 lg:pb-14 lg:pt-14">
        <div className="flex flex-col items-center">
          <p className="mb-3 font-heading text-xs uppercase tracking-[0.22em] text-[#E11D48]">
            {eyebrow}
          </p>

          <h1
            id="hero-title"
            className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-[#F5F5F7] sm:text-5xl lg:text-6xl"
          >
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#A0A0B8] sm:text-lg">
            {subtitle}
          </p>

          {/* T474: tiles de categoria sobem para logo abaixo do subtítulo —
              são o único elemento que explica a promessa ("6 categorias") e
              antes só apareciam após prova social e microcopy. */}
          <div className="w-full">
            <CategoryIconRow />
          </div>

          {/* T474: catálogo é a CTA primária (menor atrito: 625 títulos já
              acessíveis sem cadastro); cadastro passa a secundária. */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={ctaSecondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
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
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2A2A3D] px-8 py-3.5 text-sm font-semibold text-[#F5F5F7] transition-colors hover:bg-[#12121C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#818CF8]"
            >
              {cta}
            </Link>
          </div>

          {/* T474: procedência qualificada — antes era uma lista de nomes em
              texto muted que não provava nada; agora declara a agregação e o
              contraste passa de 4.18:1 (reprova) para 5.31:1 (AA). */}
          <p className="mt-7 text-xs text-[#80809B]">{sourcesLabel}</p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-xs text-[#80809B]">
            {SOURCES_STRIP.map((s) => (
              <span key={s} className="flex items-center gap-2.5">
                <span className="h-1 w-1 rounded-full bg-[#2A2A3D]" aria-hidden="true" />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
