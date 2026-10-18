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
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatarScoreLocale } from "@/lib/score-utils";
import { colors } from "@/lib/design-tokens";

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
  const locale = useLocale();

  const to100 = (v: number | null): number | null =>
    v == null ? null : scale === "0-10" ? Math.round(v * 10) : Math.round(v);

  const c = to100(critics);
  const a = to100(audience);
  const gap =
    consensus != null ? to100(consensus) : c != null && a != null ? Math.abs(c - a) : null;

  if (c == null && a == null) {
    return (
      <p className={cn("text-sm text-fg-muted", className)} role="status">
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
            <span className="tabular-nums text-fg-secondary">{formatarScoreLocale(c, locale)}</span>
          ) : (
            <span className="text-fg-muted" data-testid="sem-critica">
              {t("semCritica")}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-surface-elevated overflow-hidden" role="presentation">
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
          {a != null && (
            <span className="tabular-nums text-fg-secondary">{formatarScoreLocale(a, locale)}</span>
          )}
        </div>
        <div className="h-2 rounded-full bg-surface-elevated overflow-hidden" role="presentation">
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
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium cursor-help",
              highConsensus
                ? "bg-accent-emerald/10 text-accent-emerald"
                : "bg-score-low/10 text-score-low",
            )}
            title={t("consensusTooltip")}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: highConsensus ? colors.score.high : colors.score.low,
              }}
              aria-hidden="true"
            />
            {highConsensus ? t("highConsensus") : t("lowConsensus")}
          </span>
          {!compact && (
            <span className="tabular-nums text-fg-muted">
              {formatarScoreLocale(gap, locale)}pts
            </span>
          )}
        </div>
      )}
      {/* Gradiente visual do consenso: ponte entre crítica (#38BDF8) e público (#E11D48). */}
      {c != null && a != null && (
        <div
          className="h-1 rounded-full"
          data-testid="consensus-gradient"
          style={{
            background:
              "linear-gradient(90deg, #38BDF8 0%, #38BDF8 50%, #E11D48 50%, #E11D48 100%)",
            opacity: 0.55,
          }}
          role="presentation"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
