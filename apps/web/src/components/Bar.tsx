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
    return <p className="text-sm text-[#A0A0B8]">{t("noRatingsYet")}</p>;
  }

  return (
    <div className="space-y-3" data-testid="bar-dual">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#A0A0B8]">{t("criticsBar")}</span>
          {hasCritics ? (
            <span className="text-[#38BDF8] tabular-nums font-medium">
              {formatarScoreLocale(criticsScore, locale)}
            </span>
          ) : (
            <span className="text-[#A0A0B8]" data-testid="sem-critica">
              {t("semCritica")}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-[#1B1B2C] overflow-hidden">
          {hasCritics && (
            <div
              className="h-full rounded-full bg-[#38BDF8]"
              style={{ width: `${Math.round(((criticsScore as number) / maxScore) * 100)}%` }}
            />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#A0A0B8]">{t("audienceBar")}</span>
          {hasAudience ? (
            <span className="text-[#FB7185] tabular-nums font-medium">
              {formatarScoreLocale(audienceScore, locale)}
            </span>
          ) : (
            <span className="text-[#A0A0B8]" data-testid="sem-publico">
              {t("semPublico")}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-[#1B1B2C] overflow-hidden">
          {hasAudience && (
            <div
              className="h-full rounded-full bg-[#E11D48]"
              style={{ width: `${Math.round((audienceScore / maxScore) * 100)}%` }}
            />
          )}
        </div>
      </div>
      {gap !== null && (
        <p className="text-xs text-[#A0A0B8] mt-1">
          {t("consensusLabel")}:{" "}
          {highConsensus
            ? t("highConsensus")
            : `${t("lowConsensus")} (${formatarScoreLocale(gap, locale)}pts)`}
        </p>
      )}
    </div>
  );
}
