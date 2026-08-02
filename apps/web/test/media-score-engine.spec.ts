import { describe, it, expect } from "vitest";
import {
  calculateGlobalScore,
  calculateConsensus,
  calculateConfidenceScore,
  confidenceLevel,
  aggregateAudienceScore,
  filterOutliers,
  derivarScores,
  ALGORITHM_VERSION,
} from "@/lib/media-score-engine";
import type { SourceRating } from "@/lib/types";

/** CRIT-02 — Zelda BotW: fontes reais da especificação (jogo). */
const ZELDA_SOURCES: SourceRating[] = [
  { source: "metacritic", score: 97, maxScore: 100 },
  { source: "igdb", score: 92, maxScore: 100 },
  { source: "igdb_publico", score: 85, maxScore: 100 },
  { source: "rawg", score: 4.5, maxScore: 5 },
  { source: "steam", score: 0.9, maxScore: 1 },
];

describe("Fórmula v2 — globalScore", () => {
  it("0.5×critics + 0.5×audience quando ambos existem", () => {
    expect(calculateGlobalScore(8, 6)).toBe(7);
    expect(calculateGlobalScore(9, 7)).toBe(8);
    expect(calculateGlobalScore(7.5, 6.5)).toBe(7);
  });

  it("único disponível quando só um existe", () => {
    expect(calculateGlobalScore(null, 8)).toBe(8);
    expect(calculateGlobalScore(7.5, null)).toBe(7.5);
  });

  it("0 quando ambos null", () => {
    expect(calculateGlobalScore(null, null)).toBe(0);
  });
});

describe("Fórmula v2 — consensus DESACOPLADO", () => {
  it("consensus informativo, NUNCA afeta globalScore", () => {
    const gs = calculateGlobalScore(8, 6);
    const cs = calculateConsensus(8, 6);
    expect(gs).toBe(7);
    expect(cs).toBe(8); // 1 - min(1, 2/10) = 0.8 * 10 = 8.0
  });

  it("consensus = null quando só um score", () => {
    expect(calculateConsensus(null, 8)).toBeNull();
    expect(calculateConsensus(7.5, null)).toBeNull();
  });

  it("consensus alto quando scores próximos", () => {
    const cs = calculateConsensus(8, 8);
    expect(cs).toBe(10); // 1 - min(1, 0/10) = 1.0 * 10 = 10.0
  });
});

describe("Confidence Score — Appendix A §6", () => {
  it("calcula confidenceScore com os 4 fatores", () => {
    const cs = calculateConfidenceScore(500, 2, 1.5, 90);
    // 40×0.5 + 25×0.667 + 20×0.4 + 15×0.5 = 20 + 16.67 + 8 + 7.5 = 52.17
    expect(cs).toBeGreaterThan(50);
    expect(cs).toBeLessThan(60);
  });

  it("clamp entre 0 e 100", () => {
    expect(calculateConfidenceScore(10000, 10, 0, 0)).toBe(100);
    expect(calculateConfidenceScore(0, 0, 10, 1000)).toBe(0);
  });

  it("confidenceLevel mapeia para high/medium/low", () => {
    expect(confidenceLevel(80)).toBe("high");
    expect(confidenceLevel(50)).toBe("medium");
    expect(confidenceLevel(30)).toBe("low");
  });
});

describe("Agregação multi-fonte §3.3b", () => {
  it("weight = log(1 + votos)", () => {
    const result = aggregateAudienceScore([
      { value: 8, votes: 500 },
      { value: 7, votes: 100 },
    ]);
    expect(result).toBeGreaterThan(7.5);
    expect(result).toBeLessThan(8);
  });
});

describe("Outlier detection §3.3", () => {
  it("exclui valores com desvio > 3.0 da mediana", () => {
    const result = filterOutliers([7, 8, 7.5, 15, 8.5], 3.0);
    expect(result[3]?.excluded).toBe(true); // 15 é outlier
    expect(result[0]?.excluded).toBe(false);
  });
});

describe("algorithmVersion", () => {
  it("é media-score-v2.0", () => {
    expect(ALGORITHM_VERSION).toBe("media-score-v2.0");
  });
});

describe("derivarScores — Crítica vs Público (CRIT-02)", () => {
  it("Zelda BotW: separa crítica (metacritic 97 + igdb 92) do público", () => {
    const r = derivarScores(ZELDA_SOURCES, "game");
    // crítica: z = (97-70)/15=1.8 (peso 0.2) + (92-70)/15=1.4667 (peso 0.5)
    // zMedio = (0.36+0.7333)/0.7 = 1.5619 → 89.0
    expect(r.criticosScore).toBe(89);
    // público: igdb_publico z=1.0 (0.25) + rawg z=1.6667 (0.35) + steam z=0.75 (0.15)
    // zMedio = (0.25+0.5833+0.1125)/0.75 = 1.2611 → 81.5
    expect(r.publicoScore).toBe(81.5);
    expect(r.consenso).toBe(7.5);
    expect(r.detalhes).toHaveLength(5);
    const metacritic = r.detalhes.find((d) => d.fonte === "metacritic");
    expect(metacritic?.classificacao).toBe("critica");
    expect(metacritic?.rating_100).toBe(97);
    const steam = r.detalhes.find((d) => d.fonte === "steam");
    expect(steam?.classificacao).toBe("publico");
  });

  it("só crítica quando o mock antigo não tem fontes públicas", () => {
    const r = derivarScores(
      [
        { source: "metacritic", score: 90, maxScore: 100 },
        { source: "rottentomatoes", score: 80, maxScore: 100 },
      ],
      "movie",
    );
    expect(r.criticosScore).toBe(76.7);
    expect(r.publicoScore).toBeNull();
    expect(r.consenso).toBeNull();
  });

  it("fontes fora do registro são ignoradas", () => {
    const r = derivarScores(
      [{ source: "fonte_inventada" as SourceRating["source"], score: 99, maxScore: 100 }],
      "movie",
    );
    expect(r.detalhes).toEqual([]);
    expect(r.criticosScore).toBeNull();
    expect(r.publicoScore).toBeNull();
  });

  it("normaliza escalas diferentes para 0–100", () => {
    const r = derivarScores([{ source: "imdb", score: 8.0, maxScore: 10 }], "movie");
    const imdb = r.detalhes[0];
    expect(imdb?.rating_100).toBe(80);
    expect(imdb?.classificacao).toBe("publico");
  });

  it("anime usa pesos do bucket público (jikan/anilist)", () => {
    const r = derivarScores(
      [
        { source: "jikan", score: 9.0, maxScore: 10 },
        { source: "anilist", score: 90, maxScore: 100 },
      ],
      "anime",
    );
    expect(r.publicoScore).not.toBeNull();
    expect(r.criticosScore).toBeNull();
  });
});
