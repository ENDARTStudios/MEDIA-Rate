"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion as useMotionReduced } from "motion/react";
import Link from "next/link";
import { gsap, SplitText } from "@/lib/gsap-config";
import { ParallaxBackground } from "./ParallaxBackground";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
}

export function HeroSection({ title, subtitle, cta, ctaHref }: HeroSectionProps) {
  const shouldReduce = useMotionReduced();
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
      className="relative overflow-hidden bg-gradient-to-br from-primary-700 to-primary-900 text-white py-24 px-4"
      aria-labelledby="hero-title"
    >
      <ParallaxBackground>
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduce ? 0 : 0.6, ease: "easeOut" }}
        >
          <h1
            id="hero-title"
            ref={titleRef}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
          >
            {title}
          </h1>

          <motion.p
            className="text-lg md:text-xl text-primary-100 mb-8 max-w-2xl mx-auto"
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.5, delay: shouldReduce ? 0 : 0.2, ease: "easeOut" }}
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.5, delay: shouldReduce ? 0 : 0.3, ease: "easeOut" }}
          >
            <Link
              href={ctaHref}
              className="inline-block bg-white text-primary-700 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-700"
            >
              {cta}
            </Link>
          </motion.div>
        </motion.div>
      </ParallaxBackground>
    </section>
  );
}
