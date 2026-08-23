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
  ctaTrust: string;
}

const SOURCES_STRIP = ["IMDb", "Rotten Tomatoes", "TMDB", "Metacritic", "IGDB", "OpenCritic"];

/**
 * T415: ScoreShowcase removido; tiles navegam para a categoria.
 * T405 (server-first): hero vira SERVER COMPONENT — sem framer-motion de
 * entrada (removido o fade-in/stagger). O conteúdo do LCP pinta imediatamente
 * como HTML puro, sem hidratar motion. CategoryIconRow segue como ilha client.
 */
export function HeroSection({
  eyebrow,
  title,
  subtitle,
  cta,
  ctaHref,
  ctaSecondary,
  ctaSecondaryHref,
  ctaTrust,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      {/* Camadas de gradiente radial + glow rose (D-333) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.08)_0%,transparent_55%)]" />
        <div className="absolute left-1/2 top-1/4 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E11D48] opacity-[0.05] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 h-[360px] w-[360px] rounded-full bg-[#818CF8] opacity-[0.04] blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col items-center">
          <p className="mb-4 font-heading text-xs uppercase tracking-[0.22em] text-[#E11D48]">
            {eyebrow}
          </p>

          <h1
            id="hero-title"
            className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-[#F5F5F7] sm:text-5xl lg:text-6xl"
          >
            {title}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#A0A0B8] sm:text-lg">
            {subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
            >
              {cta}
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
              href={ctaSecondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2A2A3D] px-8 py-3.5 text-sm font-semibold text-[#F5F5F7] transition-colors hover:bg-[#12121C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#818CF8]"
            >
              {ctaSecondary}
            </Link>
          </div>

          {/* T371: microcopy de conversão sob os CTAs. */}
          <p className="mt-3 flex items-center gap-2 text-xs text-[#6B6B85]">
            <svg
              className="h-3.5 w-3.5 text-[#34D399]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {ctaTrust}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-xs text-[#6B6B85]">
            {SOURCES_STRIP.map((s) => (
              <span key={s} className="flex items-center gap-2.5">
                <span className="h-1 w-1 rounded-full bg-[#2A2A3D]" aria-hidden="true" />
                {s}
              </span>
            ))}
          </div>

          {/* T415: tiles navegam para a categoria. */}
          <div className="w-full">
            <CategoryIconRow />
          </div>
        </div>
      </div>
    </section>
  );
}
