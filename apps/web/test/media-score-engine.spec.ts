import { describe, it, expect } from "vitest";
import {
  calculateGlobalScore,
  calculateConsensus,
  calculateConfidenceScore,
  confidenceLevel,
  aggregateAudienceScore,
  filterOutliers,
  ALGORITHM_VERSION,
} from "@/lib/media-score-engine";

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
    expect(result[3]!.excluded).toBe(true); // 15 é outlier
    expect(result[0]!.excluded).toBe(false);
  });
});

describe("algorithmVersion", () => {
  it("é media-score-v2.0", () => {
    expect(ALGORITHM_VERSION).toBe("media-score-v2.0");
  });
});
