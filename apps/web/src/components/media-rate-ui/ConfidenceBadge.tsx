"use client";

/**
 * Selo de confiança (Alta/Média/Baixa) do MEDIA Score (Parte 2.2/3.3).
 *
 * - Alta: #34D399 · Média: #FBBF24 · Baixa: #F87171.
 * - Acessível: aria-label + tooltip nativo (title) com o motivo.
 */
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/types";

const BADGE_CONFIG: Record<Confidence, { color: string; bg: string; labelKey: string }> = {
  high: { color: "#34D399", bg: "rgba(52,211,153,0.12)", labelKey: "highConfidence" },
  medium: { color: "#FBBF24", bg: "rgba(251,191,36,0.12)", labelKey: "mediumConfidence" },
  low: { color: "#F87171", bg: "rgba(248,113,113,0.12)", labelKey: "lowConfidence" },
};

export interface ConfidenceBadgeProps {
  confidence: Confidence;
  showLabel?: boolean;
  tooltip?: string;
  className?: string;
}

export function ConfidenceBadge({
  confidence,
  showLabel = true,
  tooltip,
  className,
}: ConfidenceBadgeProps) {
  const t = useTranslations("catalog");
  const cfg = BADGE_CONFIG[confidence];
  const label = t(cfg.labelKey);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
      title={tooltip ?? label}
      aria-label={tooltip ? `${label} — ${tooltip}` : label}
      data-testid={`confidence-badge-${confidence}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: cfg.color }}
        aria-hidden="true"
      />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
