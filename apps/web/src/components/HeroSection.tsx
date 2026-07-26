"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { gsap, SplitText } from "@/lib/gsap-config";
import { LazyParallaxBackground } from "./lazy";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
}

export function HeroSection({ title, subtitle, cta, ctaHref }: HeroSectionProps) {
  // T046: detecta prefers-reduced-motion apos mount (evita mismatch SSR/cliente).
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !titleRef.current) return;

    const ctx = gsap.context(() => {
      const split = new SplitText(titleRef.current, { type: "chars" });
      gsap.from(split.chars, {
        opacity: 0,
        y: 24,
        stagger: 0.03,
        duration: 0.6,
        ease: "back.out(1.7)",
        delay: 0.1,
      });
      return () => split.revert();
    }, titleRef);

    return () => ctx.revert();
  }, [title]);

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-900 to-black text-white py-28 px-4"
      aria-labelledby="hero-title"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute top-20 -left-32 w-80 h-80 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-secondary-500/10 blur-2xl" />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,15,35,0)_0%,rgba(0,0,0,0.6)_100%)]" aria-hidden="true" />

      <LazyParallaxBackground>
        <motion.div
          className="max-w-4xl mx-auto text-center relative z-10"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.6, ease: "easeOut" }}
        >
          <h1
            id="hero-title"
            ref={titleRef}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-tight"
          >
            {title}
          </h1>

          <motion.p
            className="text-lg md:text-xl text-primary-100/80 mb-10 max-w-2xl mx-auto"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.2, ease: "easeOut" }}
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.3, ease: "easeOut" }}
          >
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 bg-white text-primary-800 font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-50 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-900"
            >
              {cta}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </LazyParallaxBackground>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-40" aria-hidden="true">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
