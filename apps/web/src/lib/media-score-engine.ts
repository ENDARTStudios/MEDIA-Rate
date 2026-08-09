/**
 * MEDIA Score™ Engine v3 (MET-03) — Estimador Bayesiano por mídia.
 *
 * Metodologia: MEDIA = (v / (v + m)) · S + (m / (v + m)) · C
 *   - v: total de avaliações (crítica + público)
 *   - m: threshold de confiança estatística da mídia
 *   - S: média ponderada dos componentes (crítica, público, consenso I)
 *   - C: média global do catálogo na mesma categoria (prior Bayesiano)
 *
 * O índice de consenso I REALIMENTA o score com peso por mídia (não é mais
 * puramente informativo como na v2). Obra com poucos votos é puxada para C;
 * obra com milhares de votos reflete fielmente as fontes.
 *
 * Escala: componentes internos em 0–10; a apresentação de games converte
 * para 0–100 (×10), as demais permanecem 0–10.
 */

import type { SourceRating, Confidence, SourceName, MediaType } from "@/lib/types";
import { FONTES_WEB, PESOS_POR_TIPO_WEB } from "@/lib/source-registry";

export const ALGORITHM_VERSION = "media-score-v3.0";

/** Configuração matemática por mídia (espelho da metodologia). */
export interface ConfigV3 {
  /** Escala de apresentação. */
  escala: "0-10" | "0-100";
  /** Threshold Bayesiano m (votos mínimos para confiança estatística). */
  m: number;
  /** Pesos de S: crítica + público + consenso (soma 1.00). */
  pesos: { critica: number; publico: number; consenso: number };
  /** Modo de cálculo do índice de consenso I. */
  modoConsenso: "gap" | "polarizacao" | "editoras";
  /** Correção de inflação de livros (curva se C > 8.5). */
  inflacao?: boolean;
}

export const CONFIG_V3: Record<MediaType, ConfigV3> = {
  // Filmes e Séries: crítica 40% + público 40% + consenso 20%; m = 50+10.
  movie: {
    escala: "0-10",
    m: 60,
    pesos: { critica: 0.4, publico: 0.4, consenso: 0.2 },
    modoConsenso: "gap",
  },
  series: {
    escala: "0-10",
    m: 60,
    pesos: { critica: 0.4, publico: 0.4, consenso: 0.2 },
    modoConsenso: "gap",
  },
  // Games: crítica 55% + público 35% + consenso 10%; m = 1000+15; escala 0-100.
  game: {
    escala: "0-100",
    m: 1015,
    pesos: { critica: 0.55, publico: 0.35, consenso: 0.1 },
    modoConsenso: "gap",
  },
  // Livros: crítica 25% + público 55% + consenso 20%; m = 100; inflação.
  book: {
    escala: "0-10",
    m: 100,
    pesos: { critica: 0.25, publico: 0.55, consenso: 0.2 },
    modoConsenso: "gap",
    inflacao: true,
  },
  // HQs: público 60% + consenso entre editoras 40%; m = 250.
  comic: {
    escala: "0-10",
    m: 250,
    pesos: { critica: 0, publico: 0.6, consenso: 0.4 },
    modoConsenso: "editoras",
  },
  // Mangás/Light Novels: crítica 45% + público 45% + polarização 10%; m = 500.
  manga: {
    escala: "0-10",
    m: 500,
    pesos: { critica: 0.45, publico: 0.45, consenso: 0.1 },
    modoConsenso: "polarizacao",
  },
} satisfies Record<MediaType, ConfigV3>;

export interface MediaScoreV3Params {
  /** Score da crítica em 0–10 (null = sem fontes de crítica). */
  criticosScore: number | null;
  /** Score do público em 0–10 (null = sem fontes de público). */
  publicoScore: number | null;
  /** Total de avaliações v (crítica + público). */
  votos: number;
  mediaType?: string;
  /** Índice de consenso I (0–10) fornecido externamente (polarização/editoras). */
  consenso?: number | null;
  /** Distribuição de notas (bins 1–10) — índice de polarização de mangás. */
  distribuicaoNotas?: { nota: number; votos: number }[];
  /** Média por editora — índice de consenso de editoras de HQs. */
  mediaPorEditora?: { editora: string; media: number }[];
  /** Média global do catálogo C (0–10). Default 7. */
  mediaCatalogo?: number;
}

/** §I: I = 1 − |crítica − público| em 0–10 (máximo quando concordam). */
export function calculateConsensus(
  criticsScore: number | null,
  audienceScore: number | null,
): number | null {
  if (criticsScore == null || audienceScore == null) return null;
  return Math.round((1 - Math.min(1, Math.abs(criticsScore - audienceScore) / 10)) * 100) / 10;
}

/**
 * §5: Índice de Polarização (mangás/LN) — 0–10.
 * Penaliza distribuição bimodal: muitas notas extremas (≤2 ou ≥9) sem notas
 * no meio. I = 1 − min(1, extremas/total × 1.25); todas extremas → 0.
 * Mesma quantização da API (1 decimal em 0–100 = 2 decimais em 0–10).
 */
export function calculatePolarization(
  distribution: { nota: number; votos: number }[],
): number | null {
  const total = distribution.reduce((acc, d) => acc + Math.max(0, d.votos), 0);
  if (total <= 0) return null;
  const extremas = distribution.reduce(
    (acc, d) => (d.nota <= 2 || d.nota >= 9 ? acc + Math.max(0, d.votos) : acc),
    0,
  );
  const p = extremas / total;
  return Math.round(Math.max(0, 1 - Math.min(1, p * 1.25)) * 1000) / 100;
}

/**
 * §4: Índice de Consenso de Editoras (HQs) — 0–10.
 * Mede a variação da nota entre leitores de editoras diferentes. Se fãs de
 * outras editoras aprovam, o consenso é alto (qualidade inquestionável).
 * I = 1 − min(1, desvio padrão das médias / 2.5). Mesma quantização da API.
 */
export function calculatePublisherConsensus(
  byPublisher: { editora: string; media: number }[],
): number | null {
  const medias = byPublisher.map((e) => e.media).filter((m) => Number.isFinite(m));
  if (medias.length < 2) return null;
  const mean = medias.reduce((acc, m) => acc + m, 0) / medias.length;
  const std = Math.sqrt(medias.reduce((acc, m) => acc + (m - mean) ** 2, 0) / medias.length);
  return Math.round(Math.max(0, 1 - Math.min(1, std / 2.5)) * 1000) / 100;
}

/**
 * §3: Correção de Inflação de livros — ativa quando a média do catálogo C
 * está acima de 8.5. Re-centraliza notas comuns: 8 → 7 e 9 → 7.5
 * (curva S' = min(S, 0.5·S + 3)), diferenciando obras excepcionais.
 * Sem arredondamento intermediário — o arredondamento final fica no
 * estimador Bayesiano (mesmo comportamento da API).
 */
export function aplicarCurvaInflacao(s: number, catalogMean: number): number {
  if (catalogMean <= 8.5) return s;
  return Math.min(s, 0.5 * s + 3);
}

/**
 * §1–§5: Estimador Bayesiano v3.
 *
 * S = Σ pesos × componentes (renormalizado sobre os componentes disponíveis;
 * peso zero — ex.: crítica em HQs — ignora o componente). Depois
 * MEDIA = (v/(v+m))·S + (m/(v+m))·C. Retorna na escala de apresentação da
 * mídia (games: 0–100 via ×10; demais: 0–10).
 */
export function calculateGlobalScore(params: MediaScoreV3Params): number {
  const cfg = CONFIG_V3[(params.mediaType ?? "movie") as MediaType] ?? CONFIG_V3.movie;

  let i = params.consenso ?? null;
  if (i == null && cfg.modoConsenso === "polarizacao" && params.distribuicaoNotas?.length) {
    i = calculatePolarization(params.distribuicaoNotas);
  } else if (i == null && cfg.modoConsenso === "editoras" && params.mediaPorEditora?.length) {
    i = calculatePublisherConsensus(params.mediaPorEditora);
  } else if (i == null) {
    i = calculateConsensus(params.criticosScore, params.publicoScore);
  }

  const componentes: { peso: number; valor: number }[] = [];
  if (params.criticosScore != null && cfg.pesos.critica > 0) {
    componentes.push({ peso: cfg.pesos.critica, valor: params.criticosScore });
  }
  if (params.publicoScore != null && cfg.pesos.publico > 0) {
    componentes.push({ peso: cfg.pesos.publico, valor: params.publicoScore });
  }
  if (i != null && cfg.pesos.consenso > 0) {
    componentes.push({ peso: cfg.pesos.consenso, valor: i });
  }
  const somaPesos = componentes.reduce((acc, c) => acc + c.peso, 0);
  let s: number | null =
    somaPesos > 0 ? componentes.reduce((acc, c) => acc + c.peso * c.valor, 0) / somaPesos : null;

  const c = params.mediaCatalogo ?? 7;
  if (cfg.inflacao && c > 8.5 && s != null) {
    s = aplicarCurvaInflacao(s, c);
  }

  const v = Math.max(0, params.votos);
  // Sem dados de votos (v=0), o pull Bayesiano não tem base — usa S direto
  // (evita colapsar o catálogo inteiro na média C enquanto as fontes não
  // reportam votos). Com v>0, aplica o estimador da metodologia.
  const media10 = s == null ? c : v > 0 ? (v / (v + cfg.m)) * s + (cfg.m / (v + cfg.m)) * c : s;
  const resultado = cfg.escala === "0-100" ? media10 * 10 : media10;
  return Math.round(resultado * 10) / 10;
}

/**
 * Confidence Score (CS) 0–100 — independente da mídia:
 * CS = (Cobertura·40) + (Volume·30) + (Concordância·20) + (Atualização·10)
 *   - Cobertura: fontes primárias distintas (0–5 satura).
 *   - Volume: votos totais v; satura exatamente no threshold m da mídia.
 *   - Concordância: desvio entre fontes (0–10; satura em 2.5); com menos de
 *     2 fontes não há evidência de concordância → 0 (espelho da API).
 *   - Atualização: voto nos últimos 30 dias = 1; decai até 180 dias; null = 0.
 */
export function calculateConfidenceScore(
  totalVotes: number,
  sourceCount: number,
  stdDev: number,
  ageInDays: number | null,
  threshold = 1000,
): number {
  const cobertura = Math.min(1, Math.max(0, sourceCount) / 5) * 40;
  const volume = Math.min(1, Math.max(0, totalVotes) / Math.max(1, threshold)) * 30;
  const concordancia =
    Math.max(0, sourceCount) < 2
      ? 0
      : Math.max(0, (1 - Math.min(1, Math.max(0, stdDev) / 2.5)) * 20);
  const atualizacao =
    (ageInDays == null ? 0 : ageInDays <= 30 ? 1 : Math.max(0, 1 - (ageInDays - 30) / 150)) * 10;
  const cs = cobertura + volume + concordancia + atualizacao;
  return Math.max(0, Math.min(100, Math.round(cs)));
}

/** Faixas de confiabilidade: CS ≥ 70 Alta (verde) | ≥ 40 Média (amarelo) | < 40 Baixa (cinza). */
export function confidenceLevel(score: number): Confidence {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
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
 * Espelho do cálculo da API: normaliza `score/maxScore` → 0–100,
 * classifica pela fonte no registro, agrega por z-score ponderado dentro
 * de cada bucket (pesos por tipo) e consolida 0.5×crítica + 0.5×público.
 * Fontes fora do registro ou sem peso para o tipo são ignoradas.
 *
 * NOTA (T205, P1-1 — calibração): o rescale z-score (50 + z·25 com
 * z = (rating−70)/15) gera um OFFSET sistemático vs a média simples das
 * fontes (~10,5 pts para ratings típicos ~85). Esse offset é constante com
 * o rating e INDEPENDENTE de votos — não é o prior Bayesiano m (que só
 * atua via m/(v+m) e converge com o volume real). A diferença observada
 * entre "média simples" e score agregado é esta normalização, não o prior.
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
