import { describe, it, expect } from "vitest";
import { urlMetacritic } from "../src/modules/media-score/adapters/metacritic.adapter.js";
import { urlRottenTomatoes } from "../src/modules/media-score/adapters/rottentomatoes.adapter.js";
import { extrairNumeroPorPadrao } from "../src/modules/media-score/adapters/scrape-numerico.util.js";

/**
 * T176 — conserto dos scrapers anti-bot: URL por tipo (MC exigia /movie|tv|game/
 * — sem ele 404; RT série é /tv/), UA de browser (bloqueio 403) e extração do
 * JSON-LD novo do RT (ratingValue). Probe real de produção: MC dune-part-two
 * 79, Witcher 3 game 92, Breaking Bad tv 87, RT Dune 92.
 *
 * T198: versionado (era untracked) e sem `as any` — os literais satisfazem
 * `ConsultaMedia` (só `tipo`/`titulo` são obrigatórios), então o teste fica
 * tipado de verdade.
 */

describe("urlMetacritic (T176)", () => {
  it("prefixo por tipo: movie/tv/game", () => {
    expect(urlMetacritic({ tipo: "FILME", titulo: "Duna: Parte Dois" })).toBe(
      "https://www.metacritic.com/movie/duna-parte-dois/",
    );
    expect(urlMetacritic({ tipo: "SERIE", titulo: "Breaking Bad" })).toBe(
      "https://www.metacritic.com/tv/breaking-bad/",
    );
    expect(urlMetacritic({ tipo: "GAME", titulo: "The Witcher 3: Wild Hunt" })).toBe(
      "https://www.metacritic.com/game/the-witcher-3-wild-hunt/",
    );
  });

  it("idsExternos metacritic vence o slug derivado", () => {
    const consulta = { tipo: "GAME", titulo: "X", idsExternos: { metacritic: "meu-slug" } };
    expect(urlMetacritic(consulta)).toBe("https://www.metacritic.com/game/meu-slug/");
  });
});

describe("urlRottenTomatoes (T176)", () => {
  it("filme usa /m/ e série /tv/, slug underscore", () => {
    expect(urlRottenTomatoes({ tipo: "FILME", titulo: "Dune Part Two" })).toBe(
      "https://www.rottentomatoes.com/m/dune_part_two",
    );
    expect(urlRottenTomatoes({ tipo: "SERIE", titulo: "Breaking Bad" })).toBe(
      "https://www.rottentomatoes.com/tv/breaking_bad",
    );
  });
});

describe("extração do JSON-LD novo do RT (T176)", () => {
  const html = '{"@type":"Movie","aggregateRating":{"ratingValue":92,"bestRating":100}}';

  it("ratingValue novo é extraído", () => {
    expect(extrairNumeroPorPadrao(html, /"ratingValue":\s*"?([0-9]{1,3})"?/)).toBe(92);
  });
});
