import { describe, it, expect } from "vitest";
import { normalizeDisplayScore } from "@/lib/score-utils";

describe("normalizeDisplayScore — escala por mídia (D-132 §1)", () => {
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

  it("mangá: escala nativa 0–100 (igual game) — não divide", () => {
    expect(normalizeDisplayScore(88, "manga")).toBe(88);
    expect(normalizeDisplayScore(82.7, "manga")).toBe(82.7);
  });

  it("valores já em 0–10 não são convertidos", () => {
    expect(normalizeDisplayScore(7.9, "movie")).toBe(7.9);
    expect(normalizeDisplayScore(8.5, "tv")).toBe(8.5);
  });

  it("sem mediaType definido assume escala 0–10 (default não-game)", () => {
    expect(normalizeDisplayScore(90, undefined)).toBe(9);
    expect(normalizeDisplayScore(8.2, undefined)).toBe(8.2);
  });
});
