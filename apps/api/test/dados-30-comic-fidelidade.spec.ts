import { describe, it, expect, vi } from "vitest";
import { dominioDoTipo } from "../src/modules/media-score/adapters/fonte-adapter.interface.js";
import { ComicVineAdapter } from "../src/modules/media-score/adapters/comicvine.adapter.js";
import { ComicBookRoundupAdapter } from "../src/modules/media-score/adapters/comicbookroundup.adapter.js";

// T-DADOS-30A — fidelidade dos dados de quadrinhos.
describe("T-DADOS-30A — domínio de COMIC", () => {
  it("mapeia COMIC (enum atual) para hq", () => {
    expect(dominioDoTipo("COMIC")).toBe("hq");
  });

  it("mantém HQ legado mapeado para hq", () => {
    expect(dominioDoTipo("HQ")).toBe("hq");
  });

  it("não regride os demais tipos", () => {
    expect(dominioDoTipo("FILME")).toBe("filme_serie");
    expect(dominioDoTipo("SERIE")).toBe("filme_serie");
    expect(dominioDoTipo("GAME")).toBe("game");
    expect(dominioDoTipo("LIVRO")).toBe("livro");
    expect(dominioDoTipo("MANGA")).toBe("anime_manga");
    expect(dominioDoTipo("DESCONHECIDO")).toBeNull();
  });
});

describe("T-DADOS-30A — ComicVine não inventa nota", () => {
  it("retorna [] mesmo com volume encontrado e perfil qualquer", async () => {
    vi.stubEnv("COMICVINE_API_KEY", "teste");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const notas = await new ComicVineAdapter().coletar({
      tipo: "COMIC",
      titulo: "The Sandman",
      ano: 1989,
    });

    expect(notas).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("T-DADOS-30A — ComicBookRoundup desligado", () => {
  it("ativo() é false mesmo com MEDIA_PREPARACAO_ENABLED=true", () => {
    vi.stubEnv("MEDIA_PREPARACAO_ENABLED", "true");
    expect(new ComicBookRoundupAdapter().ativo()).toBe(false);
    vi.unstubAllEnvs();
  });
});
