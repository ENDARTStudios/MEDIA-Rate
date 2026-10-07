import { describe, it, expect } from "vitest";
import {
  slugify,
  mapearKitsu,
  mapearOpenlibrary,
  resolverSlugs,
} from "../scripts/import-catalogo-livros-mangas.mjs";

/**
 * T172 (Onda D3) — mangás (Kitsu, rating percentual 0-100) e livros
 * (OpenLibrary, fase 1 sem score — honesto). Slugs com sufixo do tipo.
 */

describe("mapearKitsu (T172)", () => {
  it("averageRating percentual, canonicalTitle, startDate → ano", () => {
    const r = mapearKitsu(
      {
        canonicalTitle: "Berserk",
        synopsis: "  Guts, o espadachim negro.  ",
        startDate: "1989-08-25",
        averageRating: "85.43",
        userCount: 12345,
        posterImage: { medium: "https://media.kitsu.io/x.jpg" },
      },
      "12",
    );
    expect(r).toMatchObject({
      fonte: "kitsu",
      fonte_id: "12",
      titulo: "Berserk",
      sinopse: "Guts, o espadachim negro.",
      ano_lancamento: 1989,
      score: 85.4,
      votos: 12345,
    });
  });

  it("sem rating → score null (honesto)", () => {
    expect(mapearKitsu({ canonicalTitle: "X" }, "1").score).toBeNull();
  });

  it("slugify canônico", () => {
    expect(slugify("One Piece")).toBe("one-piece");
  });
});

describe("mapearOpenlibrary (T172)", () => {
  it("doc do search → mídia (fase 1 sem sinopse/score)", () => {
    const r = mapearOpenlibrary(
      {
        key: "/works/OL1168083W",
        title: "A Game of Thrones",
        first_publish_year: 1996,
        cover_i: 123,
      },
      { summary: { average: 4.2, count: 500 } },
    );
    expect(r).toMatchObject({
      fonte: "openlibrary",
      fonte_id: "OL1168083W",
      titulo: "A Game of Thrones",
      ano_lancamento: 1996,
      imagem_url: "https://covers.openlibrary.org/b/id/123-L.jpg",
    });
  });
});

describe("resolverSlugs (T172)", () => {
  it("colisão com sufixo do tipo; Set mutado", () => {
    const ocupados = new Set(["berserk"]);
    const r = resolverSlugs(
      [{ fonte: "kitsu", fonte_id: "1", titulo: "Berserk" }],
      ocupados,
      "manga",
    );
    expect(r[0].slug).toBe("berserk-manga");
    expect(ocupados.has("berserk-manga")).toBe(true);
  });
});
