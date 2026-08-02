/**
 * MEDIA Score™ Engine v2
 * V1.3 §3.1: globalScore = 0.5×critics + 0.5×audience (ou único disponível)
 * consensus DESACOPLADO — puramente informativo, NUNCA realimenta globalScore
 */

import type { SourceRating, Confidence, SourceName, MediaType } from "@/lib/types";
import { FONTES_WEB, PESOS_POR_TIPO_WEB } from "@/lib/source-registry";

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
  return Math.max(
    0,
    Math.min(
      100,
      40 * Math.min(1, totalVotes / 1000) +
        25 * Math.min(1, sourceCount / 3) +
        20 * (1 - Math.min(1, stdDev / 2.5)) +
        15 * (1 - Math.min(1, ageInDays / 180)),
    ),
  );
}

export function confidenceLevel(score: number): Confidence {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

/** §3.3b: Agregação multi-fonte com weight = log(1 + votos) */
export function aggregateAudienceScore(sources: { value: number; votes: number }[]): number {
  if (sources.length === 0) return 0;
  const weighted = sources.map((s) => ({
    value: s.value,
    weight: Math.log(1 + s.votes),
  }));
  const sumWeighted = weighted.reduce((acc, s) => acc + s.value * s.weight, 0);
  const sumWeights = weighted.reduce((acc, s) => acc + s.weight, 0);
  return sumWeights > 0 ? Math.round((sumWeighted / sumWeights) * 10) / 10 : 0;
}

/** Estatísticas de referência por escala (espelho da API) — média/desvio em 0–100. */
const ESCALA_ESTATISTICAS: Record<string, { media100: number; desvio100: number }> = {
  "0-10": { media100: 70, desvio100: 15 },
  "0-100": { media100: 70, desvio100: 15 },
  "0-5": { media100: 70, desvio100: 12 },
  "0-4": { media100: 75, desvio100: 12.5 },
  "ratio": { media100: 75, desvio100: 20 },
};

export interface BucketsDerivados {
  criticosScore: number | null;
  publicoScore: number | null;
  consenso: number | null;
  detalhes: {
    fonte: SourceName;
    classificacao: "critica" | "publico";
    rating_100: number;
    z_score: number;
    peso: number;
  }[];
}

/**
 * Deriva Crítica vs Público dos `sources` crus (fix CRIT-02).
 *
 * Espelho do cálculo v2 da API: normaliza `score/maxScore` → 0–100,
 * classifica pela fonte no registro, agrega por z-score ponderado dentro
 * de cada bucket (pesos por tipo) e consolida 0.5×crítica + 0.5×público.
 * Fontes fora do registro ou sem peso para o tipo são ignoradas.
 */
export function derivarScores(sources: SourceRating[], mediaType?: string): BucketsDerivados {
  const pesos = PESOS_POR_TIPO_WEB[(mediaType ?? "movie") as MediaType] ?? PESOS_POR_TIPO_WEB.movie;
  const buckets: Record<"critica" | "publico", BucketsDerivados["detalhes"]> = {
    critica: [],
    publico: [],
  };

  for (const sr of sources) {
    // imdb é o mesmo dado do OMDb (alinhado ao registro da API).
    const meta = FONTES_WEB[sr.source] ?? (sr.source === "imdb" ? FONTES_WEB.omdb : undefined);
    if (!meta) continue;
    const peso = pesos[meta.classificacao][meta.id];
    if (!peso || peso <= 0) continue;
    const rating100 = (sr.score / sr.maxScore) * 100;
    const stats = ESCALA_ESTATISTICAS[meta.escala] ?? { media100: 70, desvio100: 15 };
    const z = (rating100 - stats.media100) / stats.desvio100;
    buckets[meta.classificacao].push({
      fonte: sr.source,
      classificacao: meta.classificacao,
      rating_100: Math.round(rating100 * 10) / 10,
      z_score: z,
      peso,
    });
  }

  const criticosScore = scoreDoBucket(buckets.critica);
  const publicoScore = scoreDoBucket(buckets.publico);

  let consenso: number | null = null;
  if (criticosScore != null && publicoScore != null) {
    consenso = Math.round(Math.abs(criticosScore - publicoScore) * 10) / 10;
  }

  return {
    criticosScore,
    publicoScore,
    consenso,
    detalhes: [...buckets.critica, ...buckets.publico],
  };
}

function scoreDoBucket(bucket: BucketsDerivados["detalhes"]): number | null {
  if (bucket.length === 0) return null;
  const somaPonderada = bucket.reduce((acc, d) => acc + d.z_score * d.peso, 0);
  const somaPesos = bucket.reduce((acc, d) => acc + d.peso, 0);
  if (somaPesos === 0) return null;
  const zMedio = somaPonderada / somaPesos;
  const raw = Math.max(0, Math.min(100, 50 + zMedio * 25));
  return Math.round(raw * 10) / 10;
}

/** §3.3: Outlier detection — desvio > 3.0 da mediana → excluded */
export function filterOutliers(
  values: number[],
  threshold = 3.0,
): { value: number; excluded: boolean }[] {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid - 1] ?? 0;
  const b = sorted[mid] ?? 0;
  const median = sorted.length % 2 === 0 ? (a + b) / 2 : b;
  return values.map((v) => ({ value: v, excluded: Math.abs(v - median) > threshold }));
}

export function makeSnapshot(date: string, score: number) {
  return { date, score };
}
