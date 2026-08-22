import { describe, it, expect } from "vitest";
import {
  relacionadasDe,
  type FonteRelacao,
} from "../src/modules/recommendations/relation-graph.js";

function f(overrides: Partial<FonteRelacao> & { id: string }): FonteRelacao {
  return {
    titulo: overrides.id,
    generos: [],
    franquia: "",
    autores: [],
    adaptacoes: [],
    ...overrides,
  };
}

describe("relation-graph (T387b)", () => {
  it("mesma franquia (titulo_original normalizado) → +3 motivo franquia", () => {
    const fonte = f({ id: "a", franquia: "Harry Potter" });
    const cand = f({ id: "b", franquia: "harry-potter" });
    const r = relacionadasDe(fonte, [cand]);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ id: "b", motivo: "franquia", score: 3 });
  });

  it("adaptação cross-mídia → +2 motivo adaptacao", () => {
    const fonte = f({ id: "a", adaptacoes: ["b"] });
    const cand = f({ id: "b" });
    const r = relacionadasDe(fonte, [cand]);
    expect(r[0]).toEqual({ id: "b", motivo: "adaptacao", score: 2 });
  });

  it("mesmo autor → +2 motivo autor", () => {
    const fonte = f({ id: "a", autores: ["George Orwell"] });
    const cand = f({ id: "b", autores: ["george orwell"] });
    const r = relacionadasDe(fonte, [cand]);
    expect(r[0]).toEqual({ id: "b", motivo: "autor", score: 2 });
  });

  it("mesmo gênero → +1 motivo genero", () => {
    const fonte = f({ id: "a", generos: ["acao"] });
    const cand = f({ id: "b", generos: ["acao"] });
    const r = relacionadasDe(fonte, [cand]);
    expect(r[0]).toEqual({ id: "b", motivo: "genero", score: 1 });
  });

  it("sem relação → vazio", () => {
    const fonte = f({ id: "a", generos: ["drama"] });
    const cand = f({ id: "b", generos: ["comedia"] });
    expect(relacionadasDe(fonte, [cand])).toHaveLength(0);
  });
});
