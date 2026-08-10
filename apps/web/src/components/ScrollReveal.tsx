"use client";

/**
 * ScrollReveal (Parte 5, D-203) — reveal em scroll via GSAP + ScrollTrigger.
 *
 * - GSAP lazy-loaded (dynamic import) — fora do bundle inicial (orçamento
 *   ≤50KB gzipped).
 * - prefers-reduced-motion: renderiza os filhos direto, sem animação.
 * - Server-safe: não anima no SSR.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotionPref } from "@/lib/useReducedMotionPref";

export function ScrollReveal({
  children,
  className,
  stagger = 0.06,
  distance = 40,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  distance?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotionPref();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (shouldReduce || !ref.current) return;

    let cleanup: (() => void) | null = null;

    void (async () => {
      const mod = await import("gsap");
      const scrollMod = await import("gsap/ScrollTrigger");
      const el = ref.current;
      if (!el) return;

      const gsapCore = mod.gsap ?? mod;
      gsapCore.registerPlugin(scrollMod.ScrollTrigger);

      const targets =
        el.querySelectorAll("[data-reveal]").length > 0 ? el.querySelectorAll("[data-reveal]") : el;
      gsapCore.set(targets, { opacity: 0, y: distance });
      const anim = gsapCore.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay,
        stagger,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
      cleanup = () => {
        anim.scrollTrigger?.kill();
        anim.kill();
      };
    })();

    return () => {
      cleanup?.();
    };
  }, [shouldReduce, stagger, distance, delay]);

  return (
    <div
      ref={ref}
      className={className}
      data-testid="scroll-reveal"
      style={mounted && !shouldReduce ? undefined : { opacity: 1 }}
    >
      {children}
    </div>
  );
}
