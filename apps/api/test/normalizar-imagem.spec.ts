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

  // T196-C (#88): a decisão NÃO é mais por substring (`includes`) — hosts
  // enganosos que apenas CONTÊM "images.igdb.com" não podem ser transformados.
  const naoTransformaveis: [string, string][] = [
    ["subdomínio enganoso", "https://images.igdb.com.evil.com/t_thumb/co1.jpg"],
    ["domínio embutido no path", "https://evil.com/https://images.igdb.com/t_thumb/co1.jpg"],
    ["domínio só na query", "https://evil.com/?u=images.igdb.com/t_thumb"],
    ["userinfo", "https://user:pass@images.igdb.com/t_thumb/co1.jpg"],
    ["porta não padrão", "https://images.igdb.com:8080/t_thumb/co1.jpg"],
    ["esquema javascript", "javascript:alert(1)//images.igdb.com/t_thumb"],
    ["esquema data", "data:text/html,images.igdb.com/t_thumb"],
    ["esquema file", "file:///images.igdb.com/t_thumb"],
    ["relativa protocol-relative", "//images.igdb.com/t_thumb/co1.jpg"],
    ["sem esquema", "images.igdb.com/t_thumb/co1.jpg"],
    ["http", "http://images.igdb.com/t_thumb/co1.jpg"],
  ];

  it.each(naoTransformaveis)("%s → intacta (fail-closed)", (_nome, url) => {
    expect(normalizarImagem(url)).toBe(url);
  });

  it("URL inválida/estranha não lança e volta intacta", () => {
    expect(normalizarImagem("nao e url")).toBe("nao e url");
    expect(normalizarImagem("")).toBeNull();
  });
});
