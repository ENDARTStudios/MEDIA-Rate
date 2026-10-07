import { describe, it, expect } from "vitest";
import { limparHtml, mapearIgdbSummary, mapearComicvineDeck } from "../scripts/fix-sinopses.mjs";

/**
 * T168 — correção de sinopses: limpeza de HTML cru (Comic Vine) e
 * preenchimento de games (IGDB summary). Texto limpo não é alterado.
 */

describe("limparHtml (T168)", () => {
  it("remove tags e decodifica entidades da Comic Vine", () => {
    const suja =
      '<p><a href="/garth-ennis/4040-40644/">Garth Ennis</a> and Darick Robertson bring you THE BOYS.</p><p>Wee Hughie was an average guy &amp; everything was perfect...at least until it was torn away!</p>';
    const r = limparHtml(suja);
    expect(r).not.toContain("<");
    expect(r).not.toContain(">");
    expect(r).toContain("Garth Ennis and Darick Robertson");
    expect(r).toContain("guy & everything");
    expect(r.startsWith(" ")).toBe(false);
  });

  it("texto já limpo volta intacto (menos espaços duplicados)", () => {
    expect(limparHtml("Uma história de vingança.")).toBe("Uma história de vingança.");
    expect(limparHtml("a  b")).toBe("a b");
  });

  it("vazio/undefined → null", () => {
    expect(limparHtml(null)).toBeNull();
    expect(limparHtml("<p></p>")).toBeNull();
  });
});

describe("mapearIgdbSummary / mapearComicvineDeck (T168)", () => {
  it("summary do IGDB; fallback storyline; vazio → null", () => {
    expect(mapearIgdbSummary({ summary: " Um RPG épico. " })).toBe("Um RPG épico.");
    expect(mapearIgdbSummary({ storyline: "História." })).toBe("História.");
    expect(mapearIgdbSummary({})).toBeNull();
  });

  it("deck do Comic Vine; vazio → null", () => {
    expect(mapearComicvineDeck({ results: { deck: " Os Sete Confirmados. " } })).toBe(
      "Os Sete Confirmados.",
    );
    expect(mapearComicvineDeck({ results: {} })).toBeNull();
  });
});
