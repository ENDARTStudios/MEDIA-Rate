"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import { motion as tokens } from "@/lib/design-tokens";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const preset = tokens.presets.pageEnter;

  // T046: detecta prefers-reduced-motion apos mount para evitar mismatch SSR/cliente.
  // SSR = sempre false (igual ao servidor). Apos mount, matchMedia decide.
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // T045: safety net — se a animacao nao disparar dentro de 800ms,
  // forca visibilidade (conteudo sempre visivel por default).
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => {
      if (ref.current && ref.current.style.opacity !== "1") {
        ref.current.style.opacity = "1";
        ref.current.style.filter = "none";
        ref.current.style.transform = "none";
      }
    }, 800);
    return () => clearTimeout(t);
  }, [pathname, reduce]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={ref}
        key={pathname}
        initial={reduce ? false : preset.initial}
        animate={preset.animate}
        exit={reduce ? undefined : preset.exit}
        transition={{
          duration: reduce ? 0 : tokens.duration.page,
          ease: tokens.easing.default as [number, number, number, number],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
