"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { gsap } from "@/lib/gsap-config";
import { ScoreDial } from "@/components/ui/score-dial";
import { HoverTextEffect } from "@/components/ui/hover-text-effect";
import { cinematicEntry, neonGlow } from "@/lib/motion";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
}

export function HeroSection({ title, subtitle, cta, ctaHref }: HeroSectionProps) {
  const [reduce, setReduce] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);

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

  const glow = neonGlow();

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-[80vh] flex items-center"
      aria-labelledby="hero-title"
    >
      <div className="hero-bg-glow absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#818CF8] opacity-[0.04] blur-[150px]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[#38BDF8] opacity-[0.03] blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-[#F59E0B] opacity-[0.02] blur-[100px]" />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.04)_0%,transparent_60%)]" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <motion.div
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16"
          variants={cinematicEntry}
          initial={reduce ? "visible" : "hidden"}
          animate="visible"
        >
          <div className="flex-1 text-center lg:text-left max-w-2xl">
            <p className="text-xs text-[#818CF8] font-heading uppercase tracking-[0.2em] mb-3">
              <HoverTextEffect>MEDIA Rate</HoverTextEffect>
            </p>
            <h1
              id="hero-title"
              className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#EDE7DC] tracking-tight leading-[1.05] mb-6"
            >
              {title.split(".").map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line.trim()}
                </span>
              ))}
            </h1>

            <p className="text-base sm:text-lg text-[#9CA3AF] max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
              {subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-[#818CF8] text-[#0F172A] font-semibold text-sm hover:brightness-110 transition-all"
                style={reduce ? undefined : glow}
              >
                {cta}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg border border-[#1C1C2E] text-[#EDE7DC] font-semibold text-sm hover:bg-[#11111E] transition-colors"
              >
                Explorar catálogo
              </Link>
            </div>
          </div>

          <div ref={dialRef} className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#818CF8] opacity-[0.08] blur-[60px] scale-125" aria-hidden="true" />
              <ScoreDial score={8.7} size="lg" showBreakdown className="relative z-10" />
              <p className="text-center text-xs text-[#9CA3AF] mt-4 font-heading uppercase tracking-widest">
                MEDIA Score&trade;
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
