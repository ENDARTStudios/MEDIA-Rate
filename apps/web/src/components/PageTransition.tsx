"use client";

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { motion as tokens } from "@/lib/design-tokens";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();
  const preset = tokens.presets.pageEnter;

  return (
    <AnimatePresence mode="wait">
      <motion.div
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
