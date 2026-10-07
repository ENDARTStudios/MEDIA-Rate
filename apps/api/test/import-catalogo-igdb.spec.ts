import { describe, it, expect } from "vitest";
import { slugify, mapearJogo, resolverSlugs } from "../scripts/import-catalogo-igdb.mjs";

/**
 * T171 (Onda D2) — import de games via IGDB: mapper (cover https, ano do
 * timestamp, score nativo 0-100) e slugs únicos com sufixo "-game".
 */

describe("slugify / mapearJogo (T171)", () => {
  it("cover // normalizado para https; ano do timestamp unix; score 0-100", () => {
    const r = mapearJogo({
      id: 1942,
      name: "The Witcher 3: Wild Hunt",
      summary: "  Você é Geralt.  ",
      first_release_date: 1430438400, // 2015-05-01
      total_rating: 91.34,
      total_rating_count: 2451,
      cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/x.jpg" },
    });
    expect(r).toMatchObject({
      fonte: "igdb",
      fonte_id: "1942",
      titulo: "The Witcher 3: Wild Hunt",
      sinopse: "Você é Geralt.",
      ano_lancamento: 2015,
      imagem_url: "https://images.igdb.com/igdb/image/upload/t_thumb/x.jpg",
      score: 91.3,
      votos: 2451,
    });
    expect(() => JSON.stringify(r)).not.toThrow();
  });

  it("sem rating/cover/date → nulls; score 0 → null", () => {
    const r = mapearJogo({ id: 1, name: "X", total_rating: 0 });
    expect(r.score).toBeNull();
    expect(r.imagem_url).toBeNull();
    expect(r.ano_lancamento).toBeNull();
  });

  it("slugify canônico", () => {
    expect(slugify("Baldur's Gate 3")).toBe("baldur-s-gate-3");
  });
});

describe("resolverSlugs (T171)", () => {
  it("colisão ganha -game; Set mutado persiste", () => {
    const ocupados = new Set(["the-witcher-3"]);
    const r = resolverSlugs(
      [
        { fonte: "igdb", fonte_id: "1", titulo: "The Witcher 3", tipo: "GAME" },
        { fonte: "igdb", fonte_id: "2", titulo: "The Witcher 3", tipo: "GAME" },
      ],
      ocupados,
    );
    expect(r.map((c) => c.slug)).toEqual(["the-witcher-3-game", "the-witcher-3-game-2"]);
    expect(ocupados.has("the-witcher-3-game")).toBe(true);
  });
});
