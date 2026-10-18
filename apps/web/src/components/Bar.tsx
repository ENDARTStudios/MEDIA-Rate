"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatarScoreLocale } from "@/lib/score-utils";

interface BarProps {
  criticsScore: number | null | undefined;
  audienceScore: number | null;
  consensus?: number | null;
  /** Escala de exibição (0–100 por padrão — CRIT-02). */
  maxScore?: number;
}

export function Bar({ criticsScore, audienceScore, maxScore = 100 }: BarProps) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const hasCritics = criticsScore != null;
  const hasAudience = audienceScore != null;
  const gap =
    hasCritics && hasAudience
      ? Math.abs((criticsScore as number) - (audienceScore as number))
      : null;
  // Consenso alto: gap ≤ 10 pontos em escala 0–100.
  const highConsensus = gap !== null && gap <= 10;

  if (!hasCritics && !hasAudience) {
    return <p className="text-sm text-fg-secondary">{t("noRatingsYet")}</p>;
  }

  return (
    <div className="space-y-3" data-testid="bar-dual">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-fg-secondary">{t("criticsBar")}</span>
          {hasCritics ? (
            <span className="text-accent-sky tabular-nums font-medium">
              {formatarScoreLocale(criticsScore, locale)}
            </span>
          ) : (
            <span className="text-fg-secondary" data-testid="sem-critica">
              {t("semCritica")}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
          {hasCritics && (
            <div
              className="h-full rounded-full bg-accent-sky"
              style={{ width: `${Math.round(((criticsScore as number) / maxScore) * 100)}%` }}
            />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-fg-secondary">{t("audienceBar")}</span>
          {hasAudience ? (
            <span className="text-accent-audience tabular-nums font-medium">
              {formatarScoreLocale(audienceScore, locale)}
            </span>
          ) : (
            <span className="text-fg-secondary" data-testid="sem-publico">
              {t("semPublico")}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
          {hasAudience && (
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.round((audienceScore / maxScore) * 100)}%` }}
            />
          )}
        </div>
      </div>
      {gap !== null && (
        <p className="text-xs text-fg-secondary mt-1">
          {t("consensusLabel")}:{" "}
          {highConsensus
            ? t("highConsensus")
            : `${t("lowConsensus")} (${formatarScoreLocale(gap, locale)}pts)`}
        </p>
      )}
    </div>
  );
}
