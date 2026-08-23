"use client";

/**
 * LazyMount (D-383, hidratação preguiçosa) — monta children só quando o
 * elemento entra (ou quase entra) no viewport, via IntersectionObserver.
 * Adia a hidratação das ilhas do card (motion/zustand) até o scroll, liberando
 * a main-thread no load inicial (TTI/LCP). Fallback: monta imediato se
 * IntersectionObserver não existir.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

export function LazyMount({
  children,
  className = "",
  rootMargin = "200px",
}: {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {mounted ? children : null}
    </div>
  );
}
