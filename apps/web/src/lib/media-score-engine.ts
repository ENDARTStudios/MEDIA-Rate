// MEDIA Score™ Engine — V3 §7 formula + domain-specific scales
// score = round((0.4×critic + 0.4×audience + 0.2×consensus)×10)/10

export interface ScoreSource {
  source: string;
  score: number;
  maxScore: number;
  type: "critic" | "audience";
}

export interface ScoreInput {
  sources: ScoreSource[];
  domain: "movie" | "series" | "game";
}

export interface ScoreBreakdown {
  critic: number;
  audience: number;
  consensus: number;
}

export interface MediaScoreResult {
  consolidated: number;
  displayScore: number | string;
  scale: "0-10" | "0-100";
  confidence: "high" | "medium" | "low";
  breakdown: ScoreBreakdown;
  normalizedSources: ScoreSource[];
  explanation: string;
}

function normalizeSource(source: ScoreSource, domain: string): number {
  let normalized = source.score / source.maxScore;

  switch (source.source) {
    case "tmdb":
      normalized = source.score / 10;
      break;
    case "rawg":
      normalized = source.score / 5;
      break;
    case "igdb":
      normalized = source.score / 100;
      break;
    case "steam":
      normalized = source.score / 100;
      break;
    case "metacritic":
      normalized = source.score / 100;
      break;
    case "imdb":
      normalized = source.score / 10;
      break;
    default:
      break;
  }

  return Math.max(0, Math.min(1, normalized));
}

function computeBreakdown(sources: ScoreSource[], domain: string): ScoreBreakdown {
  const normalized = sources.map((s) => ({ ...s, normalized: normalizeSource(s, domain) }));

  const critics = normalized.filter((s) => s.type === "critic");
  const audiences = normalized.filter((s) => s.type === "audience");

  const criticAvg = critics.length > 0
    ? critics.reduce((sum, s) => sum + s.normalized, 0) / critics.length
    : 0;

  const audienceAvg = audiences.length > 0
    ? audiences.reduce((sum, s) => sum + s.normalized, 0) / audiences.length
    : 0;

  const allAvg = normalized.length > 0
    ? normalized.reduce((sum, s) => sum + s.normalized, 0) / normalized.length
    : 0;

  const agreement = 1 - Math.abs(critics.length > 0 && audiences.length > 0 ? criticAvg - audienceAvg : 0);

  const consensus = (allAvg * 0.5 + agreement * 0.5);

  return {
    critic: Math.round(criticAvg * 100),
    audience: Math.round(audienceAvg * 100),
    consensus: Math.round(consensus * 100),
  };
}

function computeConfidence(sources: ScoreSource[], domain: string): "high" | "medium" | "low" {
  const sourceCount = new Set(sources.map((s) => s.source)).size;
  const totalVotes = sources.length;

  const coverage = Math.min(1, sourceCount / 5);
  const volume = Math.min(1, totalVotes / 10);
  const critics = sources.filter((s) => s.type === "critic").length;
  const audiences = sources.filter((s) => s.type === "audience").length;
  const agreement = critics > 0 && audiences > 0
    ? 1 - Math.abs(
        sources.filter(s => s.type === "critic").reduce((sum, s) => sum + normalizeSource(s, domain), 0) / critics -
        sources.filter(s => s.type === "audience").reduce((sum, s) => sum + normalizeSource(s, domain), 0) / audiences
      )
    : 0.5;

  const freshness = sources.length > 0 ? 1 : 0;

  const score = coverage * 40 + volume * 30 + Math.max(0, agreement) * 20 + freshness * 10;

  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function computeMediaScore(input: ScoreInput): MediaScoreResult {
  const { sources, domain } = input;
  const scale = domain === "game" ? "0-100" : "0-10" as const;

  const breakdown = computeBreakdown(sources, domain);

  const V3Score = (0.4 * (breakdown.critic / 100) + 0.4 * (breakdown.audience / 100) + 0.2 * (breakdown.consensus / 100)) * 100;
  const roundToOneDecimal = Math.round(V3Score * 10) / 10;

  const displayScore = scale === "0-100" ? Math.round(roundToOneDecimal) : Math.round(roundToOneDecimal) / 10;
  const normalizedScore = scale === "0-100" ? Math.round(roundToOneDecimal) : roundToOneDecimal / 10;

  const confidence = computeConfidence(sources, domain);

  const explanation = confidence === "high"
    ? "Alto consenso entre fontes."
    : confidence === "medium"
    ? "Avaliações mistas."
    : "Consenso baixo.";

  const normalizedSources = sources.map((s) => ({
    ...s,
    score: scale === "0-100"
      ? Math.round(normalizeSource(s, domain) * 100)
      : Math.round(normalizeSource(s, domain) * 10) / 10,
    maxScore: scale === "0-100" ? 100 : 10,
    displayScore: scale === "0-100"
      ? Math.round(normalizeSource(s, domain) * 100)
      : Math.round(normalizeSource(s, domain) * 10) / 10,
  })) as any;

  return {
    consolidated: normalizedScore,
    displayScore,
    scale,
    confidence,
    breakdown,
    normalizedSources,
    explanation,
  };
}

// Helper to enrich existing mock/API media data with computed score
export function enrichMediaScore(media: any): any {
  if (!media.score || !media.score.sources) return media;

  const domain = media.type as "movie" | "series" | "game";
  const sources: ScoreSource[] = (media.score.sources || []).map((s: any) => ({
    source: s.source || "tmdb",
    score: s.score || 0,
    maxScore: s.maxScore || 10,
    type: (["metacritic", "rottentomatoes"].includes(s.source) ? "critic" : "audience") as "critic" | "audience",
  }));

  if (sources.length === 0) {
    return {
      ...media,
      computedScore: { consolidated: null, displayScore: null, scale: domain === "game" ? "0-100" : "0-10", confidence: "low", breakdown: { critic: 0, audience: 0, consensus: 0 }, normalizedSources: [], explanation: "Sem dados." },
    };
  }

  const result = computeMediaScore({ sources, domain });
  return {
    ...media,
    score: {
      ...media.score,
      consolidated: result.consolidated,
      confidence: result.confidence,
    },
    computedScore: result,
  };
}
