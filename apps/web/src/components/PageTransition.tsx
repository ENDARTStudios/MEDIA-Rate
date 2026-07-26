"use client";

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { motion as tokens } from "@/lib/design-tokens";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const preset = tokens.presets.pageEnter;

  // T045: safety net — se a animacao nao disparar dentro de 800ms,
  // forca visibilidade (conteudo sempre visivel por default).
  useEffect(() => {
    if (shouldReduce) return;
    const t = setTimeout(() => {
      if (ref.current && ref.current.style.opacity !== "1") {
        ref.current.style.opacity = "1";
        ref.current.style.filter = "none";
        ref.current.style.transform = "none";
      }
    }, 800);
    return () => clearTimeout(t);
  }, [pathname, shouldReduce]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={ref}
        key={pathname}
        initial={shouldReduce ? false : preset.initial}
        animate={preset.animate}
        exit={shouldReduce ? undefined : preset.exit}
        transition={{
          duration: shouldReduce ? 0 : tokens.duration.page,
          ease: tokens.easing.default as [number, number, number, number],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
