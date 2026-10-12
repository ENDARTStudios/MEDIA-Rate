"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "@/lib/gsap-config";

/**
 * Título com reveal por palavra (SplitText + ScrollTrigger).
 *
 * T210 (padronização de animação, D-582): `useGSAP()` no lugar de
 * `useEffect` + `gsap.context` manual e `gsap.matchMedia()` no lugar do
 * `matchMedia(...).matches` lido uma única vez. Ganhos:
 *  - cleanup automático (contexto revertido no unmount, sem vazar ScrollTrigger);
 *  - `scope` explícito (seletores limitados ao componente);
 *  - reduced-motion REATIVO: se o usuário mudar a preferência do SO com a página
 *    aberta, o matchMedia reverte a animação em vez de mantê-la congelada.
 */
export function AnimatedHeading({
  children,
  className,
  id,
  as: Tag = "h2",
}: {
  children: string;
  className?: string;
  id?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = new SplitText(el, { type: "words" });
        gsap.from(split.words, {
          opacity: 0,
          y: 20,
          stagger: 0.04,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
