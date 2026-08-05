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
import { cn } from "@/lib/utils";

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

function scoreBand(value: number, scale: "0-10" | "0-100"): { color: string; label: "high" | "medium" | "low" } {
  const n = scale === "0-100" ? value / 10 : value;
  if (n >= 8) return { color: "#34D399", label: "high" };
  if (n >= 6) return { color: "#FBBF24", label: "medium" };
  return { color: "#F87171", label: "low" };
}

export function ScoreDial({ value, scale = "0-10", size = "md", showConfidence = false, className }: ScoreDialProps) {
  const max = scale === "0-100" ? 100 : 10;
  const clamped = Math.max(0, Math.min(max, value));
  const { color, label } = scoreBand(clamped, scale);
  const cfg = SIZE_CONFIG[size];
  const circ = 2 * Math.PI * cfg.radius;
  const offset = circ - (clamped / max) * circ;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      role="img"
      aria-label={`Nota ${clamped.toLocaleString("pt-BR")} de ${max}`}
      data-testid={`score-dial-${size}`}
    >
      <svg className={cn(cfg.ring, "-rotate-90")} viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r={cfg.radius} fill="none" stroke="rgba(148,163,255,0.12)" strokeWidth={cfg.stroke} />
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
          {clamped.toLocaleString("pt-BR")}
        </span>
        {showConfidence && (
          <span className="mt-0.5 text-[9px] uppercase tracking-wider" style={{ color }}>
            {label === "high" ? "Alta" : label === "medium" ? "Média" : "Baixa"}
          </span>
        )}
      </div>
    </div>
  );
}
