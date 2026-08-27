"use client";

/**
 * PageTransition (Parte 5, D-203) — fade-in curto em navegações CLIENT-SIDE.
 *
 * F16 (Issue #17): antes, o wrapper motion renderizava o conteúdo com
 * opacity:0 já no SSR (initial opacity 0) — o H1 da home (LCP) ficava
 * invisível até a hidratação + fade-in concluírem (~10 s no Lighthouse sob
 * throttle). Agora o primeiro paint sai VISÍVEL; o fade-in só existe para
 * trocas de rota após a hidratação. prefers-reduced-motion: render direto.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useReducedMotionPref } from "@/lib/useReducedMotionPref";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotionPref();
  // SSR + primeiro render pós-hidratação: conteúdo visível, sem wrapper.
  const [hydrated, setHydrated] = useState(false);
  const initialPath = useRef(pathname);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (shouldReduce || !hydrated) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      // Nunca esconde a rota inicial; fade-in só em navegações novas.
      initial={pathname === initialPath.current ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      data-testid="page-transition"
    >
      {children}
    </motion.div>
  );
}
