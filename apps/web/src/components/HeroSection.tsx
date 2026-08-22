"use client";

import { useState } from "react";
import { Link } from "@/lib/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ScoreShowcase, type ShowcaseItem } from "@/components/landing/ScoreShowcase";
import { CategoryIconRow } from "@/components/landing/CategoryIconRow";
import type { MediaType } from "@/lib/types";

interface HeroSectionProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  ctaSecondary: string;
  ctaSecondaryHref: string;
  ctaTrust: string;
  showcaseItems: ShowcaseItem[];
}

const SOURCES_STRIP = ["IMDb", "Rotten Tomatoes", "TMDB", "Metacritic", "IGDB", "OpenCritic"];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/**
 * T358 (D-333) — Hero reformulada: mostra o produto em ação.
 * ESQUERDA = eyebrow + H1 emocional + sub concreto + 2 CTAs + strip de fontes.
 * DIREITA = ScoreShowcase (deck vivo de mídias reais com o anel do score).
 * Sem ícones genéricos e sem nomes flutuantes (removidos).
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
  showcaseItems,
}: HeroSectionProps) {
  const shouldReduce = useReducedMotion();
  // T394: tile ativo troca o showcase para o top-1 da categoria.
  const [activeType, setActiveType] = useState<MediaType | null>(null);
  const showcaseFiltrado = activeType
    ? showcaseItems.filter((i) => i.type === activeType)
    : showcaseItems;

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      {/* Camadas de gradiente radial + glow rose (D-333) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.08)_0%,transparent_55%)]" />
        <div className="absolute left-1/2 top-1/4 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E11D48] opacity-[0.05] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 h-[360px] w-[360px] rounded-full bg-[#818CF8] opacity-[0.04] blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <motion.div
          className="max-w-xl"
          variants={container}
          initial={shouldReduce ? "visible" : "hidden"}
          animate="visible"
        >
          <motion.p
            variants={item}
            className="mb-4 font-heading text-xs uppercase tracking-[0.22em] text-[#E11D48]"
          >
            {eyebrow}
          </motion.p>

          <motion.h1
            id="hero-title"
            variants={item}
            className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-[#F5F5F7] sm:text-5xl lg:text-6xl"
          >
            {title}
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 text-base leading-relaxed text-[#A0A0B8] sm:text-lg"
          >
            {subtitle}
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row">
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
          </motion.div>

          {/* T371: microcopy de conversão (zero fricção) sob os CTAs. */}
          <motion.p variants={item} className="mt-3 flex items-center gap-2 text-xs text-[#6B6B85]">
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
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-xs text-[#6B6B85]"
          >
            {SOURCES_STRIP.map((s) => (
              <span key={s} className="flex items-center gap-2.5">
                <span className="h-1 w-1 rounded-full bg-[#2A2A3D]" aria-hidden="true" />
                {s}
              </span>
            ))}
          </motion.div>

          {/* T394: 6 ícones protagonistas que trocam o showcase. */}
          <motion.div variants={item}>
            <CategoryIconRow activeType={activeType} onSelect={setActiveType} />
          </motion.div>
        </motion.div>

        <motion.div
          className="flex justify-center lg:justify-end"
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <ScoreShowcase key={activeType ?? "all"} items={showcaseFiltrado} />
        </motion.div>
      </div>
    </section>
  );
}
