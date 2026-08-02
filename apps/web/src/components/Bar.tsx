"use client";

import { useTranslations } from "next-intl";

interface BarProps {
  criticsScore: number | null | undefined;
  audienceScore: number | null;
  consensus?: number | null;
  /** Escala de exibição (0–100 por padrão — CRIT-02). */
  maxScore?: number;
}

export function Bar({ criticsScore, audienceScore, maxScore = 100 }: BarProps) {
  const t = useTranslations("catalog");
  const hasCritics = criticsScore != null;
  const hasAudience = audienceScore != null;
  const gap =
    hasCritics && hasAudience
      ? Math.abs((criticsScore as number) - (audienceScore as number))
      : null;
  // Consenso alto: gap ≤ 10 pontos em escala 0–100.
  const highConsensus = gap !== null && gap <= 10;

  if (!hasCritics && !hasAudience) {
    return <p className="text-sm text-[#6B7280]">{t("noRatingsYet")}</p>;
  }

  return (
    <div className="space-y-3" data-testid="bar-dual">
      {hasCritics && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[#9CA3AF]">{t("criticsBar")}</span>
            <span className="text-[#38BDF8] tabular-nums font-medium">{criticsScore}</span>
          </div>
          <div className="h-2 rounded-full bg-[#1C1C2E] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#38BDF8]"
              style={{ width: `${Math.round(((criticsScore as number) / maxScore) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {hasAudience && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[#9CA3AF]">{t("audienceBar")}</span>
            <span className="text-[#F59E0B] tabular-nums font-medium">{audienceScore}</span>
          </div>
          <div className="h-2 rounded-full bg-[#1C1C2E] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F59E0B]"
              style={{ width: `${Math.round((audienceScore / maxScore) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {gap !== null && (
        <p className="text-xs text-[#6B7280] mt-1">
          {t("consensusLabel")}:{" "}
          {highConsensus ? t("highConsensus") : `${t("lowConsensus")} (${gap.toFixed(1)}pts)`}
        </p>
      )}
    </div>
  );
}
