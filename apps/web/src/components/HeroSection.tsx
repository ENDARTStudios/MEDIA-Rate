"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap-config";
import { ScoreDial } from "@/components/ui/score-dial";
import { HoverTextEffect } from "@/components/ui/hover-text-effect";
import { cinematicEntry, neonGlow } from "@/lib/motion";
import { getCatalog } from "@/lib/api";
import { normalizeDisplayScore } from "@/lib/score-utils";
import { HeroIconCluster } from "@/components/media-rate-ui/HeroIconCluster";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
}

interface CyclicItem {
  title: string;
  score: number;
  scale: "0-10" | "0-100";
  typeKey: string;
}

const CYCLE_MS = 4000;

export function HeroSection({ title, subtitle, cta, ctaHref }: HeroSectionProps) {
  const t = useTranslations("hero");
  const [reduce, setReduce] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);

  // Gauge cíclico multi-mídia: um título real por categoria (score desc).
  const [cyclic, setCyclic] = useState<CyclicItem[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (reduce || !sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-bg-glow",
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 2, ease: "power2.out" },
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [reduce]);

  useEffect(() => {
    let ativo = true;
    const tipos: { key: string; api: "movie" | "series" | "game"; scale: "0-10" | "0-100" }[] = [
      { key: "Filmes", api: "movie", scale: "0-10" },
      { key: "Séries", api: "series", scale: "0-10" },
      { key: "Games", api: "game", scale: "0-100" },
    ];
    void Promise.all(
      tipos.map(async (tp) => {
        const data = await getCatalog({ type: tp.api, sort: "score", order: "desc", limit: 1 });
        const item = data?.items[0];
        if (!item?.score?.consolidated) return null;
        return {
          title: item.title,
          score: normalizeDisplayScore(item.score.consolidated, tp.api),
          scale: tp.scale,
          typeKey: tp.key,
        } satisfies CyclicItem;
      }),
    ).then((resultados) => {
      if (!ativo) return;
      const itens = resultados.filter((r): r is CyclicItem => r != null);
      if (itens.length > 0) setCyclic(itens);
    });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (reduce || cyclic.length < 2) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % cyclic.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [reduce, cyclic.length]);

  const glow = neonGlow();
  const item = cyclic[current] ?? null;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-[80vh] flex items-center"
      aria-labelledby="hero-title"
    >
      <div className="hero-bg-glow absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#818CF8] opacity-[0.04] blur-[150px]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[#38BDF8] opacity-[0.03] blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-[#34D399] opacity-[0.02] blur-[100px]" />
      </div>

      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.04)_0%,transparent_60%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* Porta de entrada do hero: ícones 3D por mídia (addendum §5). */}
        <HeroIconCluster />

        <motion.div
          className="mt-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-16"
          variants={cinematicEntry}
          initial={reduce ? "visible" : "hidden"}
          animate="visible"
        >
          <div className="flex-1 text-center lg:text-left max-w-2xl">
            <p className="text-xs text-[#818CF8] font-heading uppercase tracking-[0.2em] mb-3">
              <HoverTextEffect>{t("brandName")}</HoverTextEffect>
            </p>
            <h1
              id="hero-title"
              className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#F5F5F7] tracking-tight leading-[1.05] mb-6"
            >
              {title.split(".").map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line.trim()}
                </span>
              ))}
            </h1>

            <p className="text-base sm:text-lg text-[#A0A0B8] max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
              {subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-[#818CF8] text-[#0F172A] font-semibold text-sm hover:brightness-110 transition-all"
                style={reduce ? undefined : glow}
              >
                {cta}
                <svg
                  className="w-4 h-4"
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
                href="/catalog"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg border border-[#2A2A3D] text-[#F5F5F7] font-semibold text-sm hover:bg-[#12121C] transition-colors"
              >
                {t("exploreCatalog")}
              </Link>
            </div>
          </div>

          <div ref={dialRef} className="flex-shrink-0">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full bg-[#818CF8] opacity-[0.08] blur-[60px] scale-125"
                aria-hidden="true"
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={item ? `${item.title}-${item.typeKey}` : "default"}
                  className="relative z-10 flex flex-col items-center"
                  initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  <ScoreDial
                    score={item?.score ?? (item ? item.score : 7)}
                    size="lg"
                    showBreakdown
                    scale={item?.scale ?? "0-10"}
                  />
                  <p className="mt-4 max-w-[220px] text-center text-xs text-[#A0A0B8] font-heading uppercase tracking-widest">
                    {t("mediaScore")}
                  </p>
                  {item && (
                    <p className="mt-1 max-w-[220px] truncate text-sm font-medium text-[#F5F5F7]">
                      {item.title}
                      <span className="ml-1.5 text-[#6B6B85]">{item.typeKey}</span>
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
