"use client";

import { useTranslations } from "next-intl";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { MediaScore as MediaScoreType } from "@/lib/types";
import { scoreColor } from "@/lib/design-tokens";
import { Bar } from "./Bar";

import { normalizeDisplayScore } from "@/lib/score-utils";
import { derivarScores } from "@/lib/media-score-engine";

interface MediaScoreModuleProps {
  score: MediaScoreType | null;
  mediaType?: string;
}

function relativeTime(dateStr: string, t: ReturnType<typeof useTranslations>): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return t("today");
  if (diffDays < 30) return t("daysAgo", { days: diffDays });
  const months = Math.round(diffDays / 30);
  return t("monthsAgo", { months });
}

export function MediaScoreModule({ score, mediaType }: MediaScoreModuleProps) {
  const t = useTranslations("catalog");
  const shouldReduce = useReducedMotion();

  if (!score) {
    return (
      <div
        className="bg-[#11111E] rounded-2xl p-6 border border-[#1C1C2E]"
        data-testid="score-empty"
      >
        <p className="text-sm text-[#6B7280]">{t("scoreUnavailable")}</p>
      </div>
    );
  }

  const {
    consolidated: rawConsolidated,
    confidence,
    sources,
    explanation,
    updatedAt,
    criticsScore,
    audienceScore,
    consensus,
  } = score;

  // CRIT-02: deriva Crítica/Público dos sources crus quando o payload não
  // traz os buckets prontos (mock antigo / futura API sem persistência).
  const derivado = derivarScores(sources, mediaType);
  const criticos = criticsScore ?? derivado.criticosScore;
  const publico = audienceScore ?? derivado.publicoScore;
  const consenso = consensus ?? derivado.consenso;

  const consolidated = normalizeDisplayScore(rawConsolidated, mediaType);
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (consolidated / 100) * circ;
  const color = scoreColor(consolidated, "0-100");
  const isStale = updatedAt
    ? new Date(updatedAt).getTime() < Date.now() - 30 * 24 * 3600 * 1000
    : false;
  const confidenceLabels: Record<string, string> = {
    high: t("highConfidence"),
    medium: t("mediumConfidence"),
    low: t("lowConfidence"),
  };

  return (
    <div
      className="bg-[#11111E] rounded-2xl p-6 border border-[#1C1C2E] space-y-5"
      data-testid="score-module"
    >
      <div className="flex items-center gap-5">
        <div className="relative w-[120px] h-[120px] shrink-0">
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 120 120"
            role="img"
            aria-label={t("scoreAriaLabel", { score: consolidated, sources: sources.length })}
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgba(148,163,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="url(#score-grad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={shouldReduce ? circ * (1 - consolidated / 100) : offset}
              style={{ transition: shouldReduce ? "none" : "stroke-dashoffset 1.2s ease-out" }}
            />
            <defs>
              <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center font-heading text-2xl font-bold tabular-nums"
            style={{ color }}
          >
            {consolidated}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-100 mb-1">MEDIA Score</h3>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {confidenceLabels[confidence] ?? t("lowConfidence")}
            </span>
            {confidence === "low" && (
              <span
                className="inline-flex items-center text-[#F59E0B] cursor-help"
                title={t("fewSources")}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
            )}
          </div>
          {updatedAt && (
            <p className="text-xs text-[#6B7280] mb-1" data-testid="last-updated">
              {t("updated")} {relativeTime(updatedAt, t)}
              {isStale && (
                <span className="ml-1 px-1.5 py-0.5 bg-[#F59E0B]/15 text-[#F59E0B] rounded text-[10px]">
                  {t("mayBeOutdated")}
                </span>
              )}
            </p>
          )}
          {explanation && <p className="text-xs text-gray-400 leading-relaxed">{explanation}</p>}
        </div>
      </div>

      <div className="pt-3 border-t border-[#1C1C2E]">
        <Bar criticsScore={criticos} audienceScore={publico} consensus={consenso} />
      </div>

      <div className="space-y-2 pt-3 border-t border-[#1C1C2E]">
        <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">
          {t("sources")}
        </p>
        {sources.map((s) => {
          const norm = Math.round((s.score / s.maxScore) * 100);
          return (
            <div key={s.source} className="flex items-center gap-3 text-xs">
              <span className="w-20 text-gray-400 capitalize truncate">{s.source}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#1C1C2E] overflow-hidden">
                <div className="h-full rounded-full bg-[#38BDF8]" style={{ width: `${norm}%` }} />
              </div>
              <span className="w-8 text-right text-gray-400 tabular-nums">{s.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
