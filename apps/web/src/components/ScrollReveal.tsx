"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap-config";

interface ScrollRevealProps {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
}

export function ScrollReveal({ children, stagger = 0.05, className }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !ref.current) return;

    const ctx = gsap.context(() => {
      const elements = ref.current?.children;
      if (!elements || elements.length === 0) return;

      gsap.from(elements, {
        opacity: 0,
        y: 30,
        stagger,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [stagger]);

  return <div ref={ref} className={className}>{children}</div>;
}
