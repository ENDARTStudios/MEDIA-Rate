"use client";

/**
 * Barra dupla Crítica vs Público com indicador de Consenso (Parte 3.3/5).
 *
 * - Crítica: #38BDF8 (azul céu, "profissional").
 * - Público: #E11D48 (rose da marca, "pessoal").
 * - Consenso: gap visual entre as duas barras (quanto menor o gap, maior o
 *   consenso), com label qualitativo.
 * - Escala-aware: valores em 0–100 por padrão (escala da API); `scale="0-10"`
 *   normaliza internamente.
 */
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface CriticsVsAudienceBarProps {
  critics: number | null;
  audience: number | null;
  /** Gap explícito (0–100). Se ausente, calculado de critics/audience. */
  consensus?: number | null;
  scale?: "0-10" | "0-100";
  compact?: boolean;
  className?: string;
}

const CRITICS_COLOR = "#38BDF8";
const AUDIENCE_COLOR = "#E11D48";

export function CriticsVsAudienceBar({
  critics,
  audience,
  consensus,
  scale = "0-100",
  compact = false,
  className,
}: CriticsVsAudienceBarProps) {
  const t = useTranslations("catalog");

  const to100 = (v: number | null): number | null =>
    v == null ? null : scale === "0-10" ? Math.round(v * 10) : Math.round(v);

  const c = to100(critics);
  const a = to100(audience);
  const gap =
    consensus != null ? to100(consensus) : c != null && a != null ? Math.abs(c - a) : null;

  if (c == null && a == null) {
    return (
      <p className={cn("text-sm text-[#6B6B85]", className)} role="status">
        {t("noRatingsYet")}
      </p>
    );
  }

  const highConsensus = gap != null && gap <= 10;

  return (
    <div className={cn("space-y-3", className)} data-testid="critics-audience-bar">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium" style={{ color: CRITICS_COLOR }}>
            {t("criticsBar")}
          </span>
          {c != null ? (
            <span className="tabular-nums text-[#A0A0B8]">{c.toFixed(1)}</span>
          ) : (
            <span className="text-[#6B6B85]" data-testid="sem-critica">
              {t("semCritica")}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-[#1B1B2C] overflow-hidden" role="presentation">
          {c != null && (
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, c))}%`, backgroundColor: CRITICS_COLOR }}
            />
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium" style={{ color: AUDIENCE_COLOR }}>
            {t("audienceBar")}
          </span>
          {a != null && <span className="tabular-nums text-[#A0A0B8]">{a.toFixed(1)}</span>}
        </div>
        <div className="h-2 rounded-full bg-[#1B1B2C] overflow-hidden" role="presentation">
          {a != null && (
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max(0, Math.min(100, a))}%`,
                backgroundColor: AUDIENCE_COLOR,
              }}
            />
          )}
        </div>
      </div>

      {gap != null && (
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium",
              highConsensus ? "bg-[#34D399]/10 text-[#34D399]" : "bg-[#F87171]/10 text-[#F87171]",
            )}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: highConsensus ? "#34D399" : "#F87171" }}
              aria-hidden="true"
            />
            {highConsensus ? t("highConsensus") : t("lowConsensus")}
          </span>
          {!compact && <span className="tabular-nums text-[#6B6B85]">{gap.toFixed(1)}pts</span>}
        </div>
      )}
    </div>
  );
}
