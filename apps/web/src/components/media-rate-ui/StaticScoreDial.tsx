/**
 * StaticScoreDial (T405/D-380) — dial de score escala-aware SEM hidratação.
 *
 * Espelho visual do ScoreDial (client), mas puro JSX/SVG renderizado no
 * servidor: sem contador animejs, sem IntersectionObserver. Usado pelo
 * MediaCardShell para que os 60 cards dos carrosséis não hidratem JS de
 * animação (o gargalo de TTI/LCP da home).
 *
 * - Escala via prop ("0-10" | "0-100"); cor por faixa relativa à escala.
 * - aria-label com valor + escala; data-testid idêntico ao ScoreDial (md).
 */
import { cn } from "@/lib/utils";

const SIZE_CONFIG = {
  sm: { ring: "h-10 w-10", number: "text-sm", stroke: 3, radius: 14 },
  md: { ring: "h-16 w-16", number: "text-xl", stroke: 4, radius: 24 },
  lg: { ring: "h-24 w-24", number: "text-3xl", stroke: 6, radius: 38 },
} as const;

function scoreBand(value: number, scale: "0-10" | "0-100"): string {
  const n = scale === "0-100" ? value / 10 : value;
  if (n >= 8) return "#34D399";
  if (n >= 6) return "#FBBF24";
  return "#F87171";
}

export interface StaticScoreDialProps {
  value: number;
  scale?: "0-10" | "0-100";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StaticScoreDial({
  value,
  scale = "0-10",
  size = "md",
  className,
}: StaticScoreDialProps) {
  const max = scale === "0-100" ? 100 : 10;
  const clamped = Math.max(0, Math.min(max, value));
  const color = scoreBand(clamped, scale);
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
          {clamped.toLocaleString("pt-BR")}
        </span>
      </div>
    </div>
  );
}
