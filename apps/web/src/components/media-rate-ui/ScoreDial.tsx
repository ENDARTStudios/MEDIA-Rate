"use client";

/**
 * ScoreDial (Parte 4 da D-203) — dial de score escala-aware.
 *
 * - Escala via prop ("0-10" | "0-100") — nunca hardcoded.
 * - Cor por faixa relativa à escala: alto #34D399 (≥8/≥80),
 *   médio #FBBF24 (≥6/≥60), baixo #F87171 (<6/<60).
 * - Número em JetBrains Mono (--font-mono) com tabular-nums.
 * - aria-label com valor + escala (ex.: "Nota 8.4 de 10").
 * - showConfidence: exibe rótulo textual da faixa.
 * - Sem animação (F7) — estrutura pronta para prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotionPref } from "@/lib/useReducedMotionPref";

export interface ScoreDialProps {
  value: number;
  scale?: "0-10" | "0-100";
  size?: "sm" | "md" | "lg";
  showConfidence?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { ring: "h-10 w-10", number: "text-sm", stroke: 3, radius: 14 },
  md: { ring: "h-16 w-16", number: "text-xl", stroke: 4, radius: 24 },
  lg: { ring: "h-24 w-24", number: "text-3xl", stroke: 6, radius: 38 },
} as const;

function scoreBand(
  value: number,
  scale: "0-10" | "0-100",
): { color: string; label: "high" | "medium" | "low" } {
  const n = scale === "0-100" ? value / 10 : value;
  if (n >= 8) return { color: "#34D399", label: "high" };
  if (n >= 6) return { color: "#FBBF24", label: "medium" };
  return { color: "#F87171", label: "low" };
}

export function ScoreDial({
  value,
  scale = "0-10",
  size = "md",
  showConfidence = false,
  className,
}: ScoreDialProps) {
  const max = scale === "0-100" ? 100 : 10;
  const clamped = Math.max(0, Math.min(max, value));
  const { color, label } = scoreBand(clamped, scale);
  const cfg = SIZE_CONFIG[size];
  const circ = 2 * Math.PI * cfg.radius;
  const offset = circ - (clamped / max) * circ;
  const shouldReduce = useReducedMotionPref();
  const rootRef = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(clamped);

  // Contador 0 → valor quando entra no viewport (Anime.js lazy) — Part 5.
  // prefers-reduced-motion: valor final direto, sem animação.
  useEffect(() => {
    if (shouldReduce) {
      setDisplay(clamped);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setDisplay(clamped);
      return;
    }
    let cancel = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || cancel) return;
        observer.disconnect();
        void (async () => {
          const { animate } = await import("animejs");
          if (cancel) return;
          const target = { v: 0 };
          animate(target, {
            v: clamped,
            duration: 800,
            ease: "outQuad",
            onUpdate: () => {
              if (!cancel) setDisplay(Math.round(target.v));
            },
          });
        })();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      cancel = true;
      observer.disconnect();
    };
  }, [clamped, shouldReduce]);

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      role="img"
      aria-label={`Nota ${clamped.toLocaleString("pt-BR")} de ${max}`}
      data-testid={`score-dial-${size}`}
    >
      <svg className={cn(cfg.ring, "-rotate-90")} viewBox="0 0 60 60" aria-hidden="true">
        <circle
          cx="30"
          cy="30"
          r={cfg.radius}
          fill="none"
          stroke="rgba(148,163,255,0.12)"
          strokeWidth={cfg.stroke}
        />
        <circle
          cx="30"
          cy="30"
          r={cfg.radius}
          fill="none"
          stroke={color}
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn("font-mono font-bold tabular-nums", cfg.number)} style={{ color }}>
          {display.toLocaleString("pt-BR")}
        </span>
        {showConfidence && (
          <span className="mt-0.5 text-xs uppercase tracking-wider" style={{ color }}>
            {label === "high" ? "Alta" : label === "medium" ? "Média" : "Baixa"}
          </span>
        )}
      </div>
    </div>
  );
}
