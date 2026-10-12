"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap-config";

/**
 * Parallax de fundo por scroll scrub.
 *
 * T210 (padronização de animação, D-582): `useGSAP()` + `gsap.matchMedia()` no
 * lugar de `useEffect` + `gsap.context` + checagem única de `prefers-reduced-motion`.
 * Ganhos: cleanup garantido no unmount (sem ScrollTrigger órfão) e reduced-motion
 * reativo a mudança de preferência do SO.
 */
export function ParallaxBackground({
  children,
  speed = 0.3,
}: {
  children: React.ReactNode;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(el, {
          y: `${speed * 100}%`,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [speed] },
  );

  return <div ref={ref}>{children}</div>;
}
