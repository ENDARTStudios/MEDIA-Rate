import { describe, it, expect } from "vitest";
import { normalizarImagem } from "../src/common/normalizar-imagem.js";

describe("normalizarImagem (D-262) — IGDB t_thumb → t_cover_big", () => {
  it("converte t_thumb para t_cover_big em URLs IGDB", () => {
    const url = "https://images.igdb.com/igdb/image/upload/t_thumb/co3pzm.jpg";
    expect(normalizarImagem(url)).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co3pzm.jpg",
    );
  });

  it("nao altera URLs de outras fontes (TMDB/OpenLibrary)", () => {
    const tmdb = "https://image.tmdb.org/t/p/w500/x.jpg";
    const ol = "https://covers.openlibrary.org/b/id/123-L.jpg";
    expect(normalizarImagem(tmdb)).toBe(tmdb);
    expect(normalizarImagem(ol)).toBe(ol);
  });

  it("null/undefined → null", () => {
    expect(normalizarImagem(null)).toBeNull();
    expect(normalizarImagem(undefined)).toBeNull();
  });
});
