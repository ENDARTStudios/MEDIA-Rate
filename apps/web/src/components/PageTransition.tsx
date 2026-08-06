"use client";

/**
 * PageTransition (Parte 5, D-203) — fade-in curto em cada navegação via
 * Motion. Sem exit-blocking (AnimatePresence wait): o novo conteúdo apenas
 * fade-in, evitando layout shift/jank em rotas client-side.
 * prefers-reduced-motion: render direto, sem transição.
 */
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useReducedMotionPref } from "@/lib/useReducedMotionPref";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotionPref();

  if (shouldReduce) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      data-testid="page-transition"
    >
      {children}
    </motion.div>
  );
}
