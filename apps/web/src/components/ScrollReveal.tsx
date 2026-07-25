"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap-config";

export function ScrollReveal({
  children,
  stagger = 0.06,
  distance = 40,
  className,
}: {
  children: React.ReactNode;
  stagger?: number;
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !ref.current) return;

    const ctx = gsap.context(() => {
      const elements = ref.current?.children;
      if (!elements || elements.length === 0) return;

      gsap.set(elements, { opacity: 0, y: distance });
      ScrollTrigger.batch(elements, {
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            stagger,
            duration: 0.7,
            ease: "power3.out",
          }),
        start: "top 85%",
      });
    }, ref);

    return () => ctx.revert();
  }, [stagger, distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
