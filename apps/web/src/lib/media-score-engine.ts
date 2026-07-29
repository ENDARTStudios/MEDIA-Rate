/**
 * MEDIA Score™ Engine v2
 * V1.3 §3.1: globalScore = 0.5×critics + 0.5×audience (ou único disponível)
 * consensus DESACOPLADO — puramente informativo, NUNCA realimenta globalScore
 */

import type { MediaScore, SourceRating, Confidence, SourceName } from "@/lib/types";

export const ALGORITHM_VERSION = "media-score-v2.0";

/** §3.1: Fórmula v2 */
export function calculateGlobalScore(
  criticsScore: number | null,
  audienceScore: number | null,
): number {
  if (criticsScore != null && audienceScore != null) {
    return Math.round((0.5 * criticsScore + 0.5 * audienceScore) * 10) / 10;
  }
  if (criticsScore != null) return Math.round(criticsScore * 10) / 10;
  if (audienceScore != null) return Math.round(audienceScore * 10) / 10;
  return 0;
}

/** §3.1: consensus informativo — NUNCA realimenta globalScore */
export function calculateConsensus(
  criticsScore: number | null,
  audienceScore: number | null,
): number | null {
  if (criticsScore == null || audienceScore == null) return null;
  return Math.round((1 - Math.min(1, Math.abs(criticsScore - audienceScore) / 10)) * 100) / 10;
}

/** Appendix A §6: Confidence Score */
export function calculateConfidenceScore(
  totalVotes: number,
  sourceCount: number,
  stdDev: number,
  ageInDays: number,
): number {
  return Math.max(0, Math.min(100,
    40 * Math.min(1, totalVotes / 1000) +
    25 * Math.min(1, sourceCount / 3) +
    20 * (1 - Math.min(1, stdDev / 2.5)) +
    15 * (1 - Math.min(1, ageInDays / 180)),
  ));
}

export function confidenceLevel(score: number): Confidence {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

/** §3.3b: Agregação multi-fonte com weight = log(1 + votos) */
export function aggregateAudienceScore(sources: Array<{ value: number; votes: number }>): number {
  if (sources.length === 0) return 0;
  const weighted = sources.map((s) => ({
    value: s.value,
    weight: Math.log(1 + s.votes),
  }));
  const sumWeighted = weighted.reduce((acc, s) => acc + s.value * s.weight, 0);
  const sumWeights = weighted.reduce((acc, s) => acc + s.weight, 0);
  return sumWeights > 0 ? Math.round((sumWeighted / sumWeights) * 10) / 10 : 0;
}

/** §3.3: Outlier detection — desvio > 3.0 da mediana → excluded */
export function filterOutliers(values: number[], threshold: number = 3.0): Array<{ value: number; excluded: boolean }> {
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2
    : sorted[Math.floor(sorted.length / 2)]!;
  return values.map((v) => ({ value: v, excluded: Math.abs(v - median) > threshold }));
}

export function makeSnapshot(date: string, score: number) {
  return { date, score };
}
