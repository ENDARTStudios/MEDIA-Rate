"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { scoreColor } from "@/lib/design-tokens";

interface ScoreRingProps {
  score: number;
  scale?: "0-10" | "0-100";
  size?: number;
  className?: string;
}

/**
 * T358 — anel do MEDIA Score com count-up do número.
 * - Anel desenha via stroke-dashoffset (CSS, 900ms easeOutCubic).
 * - Número conta de 0 → score via rAF (gated por prefers-reduced-motion).
 * - Cor do anel derivada do score (scoreColor do design system).
 */
export function ScoreRing({ score, scale = "0-10", size = 168, className }: ScoreRingProps) {
  const shouldReduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const numRef = useRef<HTMLSpanElement>(null);

  const clamped = Math.max(0, scale === "0-100" ? Math.min(100, score) : Math.min(10, score));
  const ringPct = scale === "0-100" ? clamped / 100 : clamped / 10;
  const color = scoreColor(clamped, scale);
  const r = 62;
  const c = 2 * Math.PI * r;
  const targetOffset = c * (1 - ringPct);

  useEffect(() => {
    if (shouldReduce) {
      setDisplay(clamped);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(clamped * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped, shouldReduce]);

  const displayText = scale === "0-100" ? Math.round(display) : display.toFixed(1);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1C1C2E" strokeWidth="7" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={targetOffset}
          style={{
            transition: shouldReduce
              ? "none"
              : "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)",
            filter: `drop-shadow(0 0 6px ${color}66)`,
          }}
        />
      </svg>
      <span
        ref={numRef}
        className="absolute font-heading font-bold tabular-nums"
        style={{ color, fontSize: Math.round(size * 0.26) }}
      >
        {displayText}
      </span>
    </div>
  );
}
