"use client";

import { useTranslations } from "next-intl";
import { MediaScoreBadge } from "./MediaScoreBadge";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { MediaScore as MediaScoreType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { scoreColor } from "@/lib/design-tokens";

interface MediaScoreModuleProps {
  score: MediaScoreType | null;
}

function scoreModuleColor(consolidated: number, scale: "0-10" | "0-100" = "0-10"): string {
  return scoreColor(consolidated, scale);
}

export function MediaScoreModule({ score }: MediaScoreModuleProps) {
  const t = useTranslations("catalog");
  const shouldReduce = useReducedMotion();

  if (!score) {
    return (
      <div className="bg-surface-card rounded-2xl p-6 border border-surface-border/30">
        <p className="text-sm text-gray-500">{t("mediaScore")} indisponível</p>
      </div>
    );
  }

  const { consolidated, confidence, sources, explanation } = score;
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (consolidated / 100) * circ;
  const color = scoreModuleColor(consolidated, "0-100");

  return (
    <div className="bg-surface-card rounded-2xl p-6 border border-surface-border/30 space-y-5">
      <div className="flex items-center gap-5">
        <div className="relative w-[120px] h-[120px] shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(148,163,255,0.1)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r={radius} fill="none"
              stroke="url(#score-grad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={shouldReduce ? circ * (1 - consolidated / 100) : offset}
              style={{ transition: shouldReduce ? "none" : "stroke-dashoffset 1.2s ease-out" }}
            />
            <defs>
              <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-bold tabular-nums" style={{ color }}>
            {consolidated}
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-100 mb-1">
            {t("mediaScore")}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${color}20`, color }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              {confidence === "high" ? "Alta" : confidence === "medium" ? "Média" : "Baixa"} confiança
            </span>
          </div>
          {explanation && (
            <p className="text-xs text-gray-400 leading-relaxed">{explanation}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-surface-border/30">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Fontes</p>
        {sources.map((s) => {
          const norm = Math.round((s.score / s.maxScore) * 100);
          return (
            <div key={s.source} className="flex items-center gap-3 text-xs">
              <span className="w-20 text-gray-400 capitalize truncate">{s.source}</span>
              <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${norm}%`, background: `linear-gradient(90deg,${color},${color}80)`, transition: shouldReduce ? "none" : "width 0.7s ease-out" }} />
              </div>
              <span className="w-14 text-right text-gray-300 tabular-nums">{s.score}/{s.maxScore}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
