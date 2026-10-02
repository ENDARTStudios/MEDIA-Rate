import { describe, it, expect } from "vitest";
import { normalizeDisplayScore, truncar1 } from "@/lib/score-utils";

describe("normalizeDisplayScore — escala por mídia (D-132 §1 / BETA-GAP-09)", () => {
  it("game: mantém escala 0–100 sem conversão", () => {
    expect(normalizeDisplayScore(89.4, "game")).toBe(89.4);
    expect(normalizeDisplayScore(100, "game")).toBe(100);
    expect(normalizeDisplayScore(0, "game")).toBe(0);
  });

  it("filme/série/livro/HQ: converte 0–100 para 0–10", () => {
    expect(normalizeDisplayScore(79, "movie")).toBe(7.9);
    expect(normalizeDisplayScore(55, "tv")).toBe(5.5);
    expect(normalizeDisplayScore(65, "book")).toBe(6.5);
    expect(normalizeDisplayScore(70, "comic")).toBe(7);
  });

  it("BETA-GAP-09: mangá é 0–10 (não 0–100)", () => {
    expect(normalizeDisplayScore(88, "manga")).toBe(8.8);
    expect(normalizeDisplayScore(82.7, "manga")).toBe(8.2);
    expect(normalizeDisplayScore(100, "manga")).toBe(10);
  });

  it("BETA-GAP-09: sem arredondamento (trunca 1 casa)", () => {
    expect(normalizeDisplayScore(7.95, "movie")).toBe(7.9);
    expect(normalizeDisplayScore(6.422580645161291, "movie")).toBe(6.4);
    expect(normalizeDisplayScore(89.99, "game")).toBe(89.9);
    expect(normalizeDisplayScore(8.29, "tv")).toBe(8.2);
    expect(truncar1(7.95)).toBe(7.9);
    expect(truncar1(8)).toBe(8);
  });

  it("valores já em 0–10 não são convertidos", () => {
    expect(normalizeDisplayScore(7.9, "movie")).toBe(7.9);
    expect(normalizeDisplayScore(8.5, "tv")).toBe(8.5);
    expect(normalizeDisplayScore(8, "movie")).toBe(8);
  });

  it("sem mediaType definido assume escala 0–10 (default não-game)", () => {
    expect(normalizeDisplayScore(90, undefined)).toBe(9);
    expect(normalizeDisplayScore(8.2, undefined)).toBe(8.2);
  });

  it("BETA-GAP-09: entradas inválidas não geram NaN/Infinity", () => {
    expect(normalizeDisplayScore(Number.NaN, "movie")).toBe(0);
    expect(normalizeDisplayScore(Number.POSITIVE_INFINITY, "game")).toBe(0);
  });
});
