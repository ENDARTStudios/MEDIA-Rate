import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * T226/D-240 — backfill de pôsteres: fontes por tipo com graceful
 * degradation. Testes com fetch mockado por fonte (sucesso, 404, timeout).
 *
 * O seed-posters roda `preencher()` no import (padrão dos seeds via CLI);
 * mockamos o PrismaClient para neutralizar a conexão real durante o teste —
 * as funções testadas aqui (capa* e urlSegura) são puras sobre fetch.
 */
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function () {
    return {
      midia: {
        findMany: vi.fn(async () => []),
        update: vi.fn(async () => ({})),
      },
      $disconnect: vi.fn(async () => {}),
    };
  }),
}));

import { urlSegura, capaIgdb, capaGoogleBooks, capaJikan, capaOpenLibrary, capaObraRelacionada } from "../prisma/seed-posters.js";

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(handler));
}

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("T226 — seed-posters: fontes por tipo (D-240)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("urlSegura", () => {
    it("aceita https e protocol-relative; rejeita http/vazio", () => {
      expect(urlSegura("https://img.example.com/a.jpg")).toBe("https://img.example.com/a.jpg");
      expect(urlSegura("//img.example.com/a.jpg")).toBe("https://img.example.com/a.jpg");
      expect(urlSegura("http://img.example.com/a.jpg")).toBeNull();
      expect(urlSegura("")).toBeNull();
      expect(urlSegura(null)).toBeNull();
    });
  });

  describe("GAME → IGDB cover (OAuth Twitch)", () => {
    it("sucesso: POST APGQL em games → cover id → covers → url https", async () => {
      let chamadas = 0;
      mockFetch((url, init) => {
        chamadas++;
        if (url.includes("id.twitch.tv")) {
          // T236: o token do Twitch exige POST form-urlencoded — o mock
          // deve receber method POST e body com client_id/secret.
          expect(init?.method).toBe("POST");
          expect(String(init?.body)).toContain("grant_type=client_credentials");
          return Promise.resolve(jsonRes({ access_token: "tok123", expires_in: 3600 }));
        }
        // T257: o IGDB v4 exige POST com body APGQL; games retorna cover como
        // ID e a URL vem da query em /covers.
        expect(init?.method).toBe("POST");
        const body = String(init?.body ?? "");
        if (url.includes("/v4/games")) {
          expect(body).toContain("fields cover");
          expect(body).toContain("where id = 588");
          return Promise.resolve(jsonRes([{ id: 588, cover: 1024 }]));
        }
        if (url.includes("/v4/covers")) {
          expect(body).toContain("fields url");
          expect(body).toContain("where id = 1024");
          return Promise.resolve(jsonRes([{ id: 1024, url: "//images.igdb.com/igdb/image/upload/t_cover_big/gta5.jpg" }]));
        }
        return Promise.resolve(jsonRes([]));
      });
      process.env.TWITCH_CLIENT_ID = "cid";
      process.env.TWITCH_CLIENT_SECRET = "sec";

      const capa = await capaIgdb("588", "Grand Theft Auto V");

      expect(chamadas).toBe(3); // oauth + games + covers
      expect(capa).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big/gta5.jpg");
    });

    it("cover como objeto {id} também funciona (variante da resposta)", async () => {
      mockFetch((url) => {
        if (url.includes("id.twitch.tv")) return Promise.resolve(jsonRes({ access_token: "tok", expires_in: 3600 }));
        if (url.includes("/v4/games")) return Promise.resolve(jsonRes([{ id: 588, cover: { id: 777 } }]));
        if (url.includes("/v4/covers")) return Promise.resolve(jsonRes([{ id: 777, url: "//img.example.com/c.jpg" }]));
        return Promise.resolve(jsonRes([]));
      });
      process.env.TWITCH_CLIENT_ID = "cid";
      process.env.TWITCH_CLIENT_SECRET = "sec";
      const capa = await capaIgdb("588", "X");
      expect(capa).toBe("https://img.example.com/c.jpg");
    });

    it("T236: chaves presentes mas token endpoint retorna erro → null (graceful)", async () => {
      process.env.TWITCH_CLIENT_ID = "cid";
      process.env.TWITCH_CLIENT_SECRET = "sec";
      mockFetch((url) => {
        if (url.includes("id.twitch.tv")) {
          return Promise.resolve(new Response("unauthorized", { status: 401 }));
        }
        return Promise.resolve(jsonRes([{}]));
      });
      const capa = await capaIgdb("588", "GTA V");
      expect(capa).toBeNull();
    });

    it("404/erro → null (graceful, não lança)", async () => {
      process.env.TWITCH_CLIENT_ID = "cid";
      process.env.TWITCH_CLIENT_SECRET = "sec";
      mockFetch(() => Promise.resolve(new Response("erro", { status: 404 })));
      const capa = await capaIgdb("588", "GTA V");
      expect(capa).toBeNull();
    });

    it("sem chaves Twitch → null sem lançar (docker sem env)", async () => {
      delete process.env.TWITCH_CLIENT_ID;
      delete process.env.TWITCH_CLIENT_SECRET;
      mockFetch(() => Promise.resolve(jsonRes([{}])));
      const capa = await capaIgdb("588", "GTA V");
      expect(capa).toBeNull();
    });

    it("fonte_id não-numérico → null (nunca interpola slug no where)", async () => {
      process.env.TWITCH_CLIENT_ID = "cid";
      process.env.TWITCH_CLIENT_SECRET = "sec";
      const capa = await capaIgdb("nao-numerico", "X");
      expect(capa).toBeNull();
    });
  });

  describe("LIVRO → Google Books", () => {
    it("sucesso: thumbnail https", async () => {
      process.env.GOOGLE_BOOKS_API_KEY = "key";
      mockFetch(() =>
        Promise.resolve(
          jsonRes({ items: [{ volumeInfo: { imageLinks: { thumbnail: "https://books.google.com/covers/duna.jpg" } } }] }),
        ),
      );
      const capa = await capaGoogleBooks("Duna", "duna");
      expect(capa).toBe("https://books.google.com/covers/duna.jpg");
    });

    it("sem chave → null (docker sem env)", async () => {
      delete process.env.GOOGLE_BOOKS_API_KEY;
      mockFetch(() => Promise.resolve(jsonRes({})));
      const capa = await capaGoogleBooks("Duna", "duna");
      expect(capa).toBeNull();
    });

    it("timeout/erro de rede → null após retry (graceful)", async () => {
      process.env.GOOGLE_BOOKS_API_KEY = "key";
      let chamadas = 0;
      mockFetch(() => {
        chamadas++;
        return Promise.reject(new Error("network down"));
      });
      const capa = await capaGoogleBooks("Duna", "duna");
      expect(capa).toBeNull();
      expect(chamadas).toBeLessThanOrEqual(2); // 1 tentativa + 1 retry
    });
  });

  describe("MANGA → Jikan (público)", () => {
    it("sucesso: webp large_image_url", async () => {
      mockFetch(() =>
        Promise.resolve(
          jsonRes({ data: [{ title: "Berserk", images: { webp: { large_image_url: "https://cdn.myanimelist.net/images/manga/berserk.webp" } } }] }),
        ),
      );
      const capa = await capaJikan("Berserk");
      expect(capa).toBe("https://cdn.myanimelist.net/images/manga/berserk.webp");
    });

    it("404 → null (graceful)", async () => {
      mockFetch(() => Promise.resolve(new Response("nada", { status: 404 })));
      const capa = await capaJikan("Berserk");
      expect(capa).toBeNull();
    });
  });

  describe("T255 — MANGA fallback por obra relacionada", () => {
    it("usa poster da série com o mesmo título quando o mangá não tem capa", async () => {
      const prisma = {
        midia: {
          findMany: vi.fn(async () => [
            { imagem_url: "https://image.tmdb.org/t/p/w500/berserk-serie.jpg" },
          ]),
        },
      };
      const capa = await capaObraRelacionada(prisma as unknown as import("@prisma/client").PrismaClient, "Berserk");
      expect(capa).toBe("https://image.tmdb.org/t/p/w500/berserk-serie.jpg");
      expect(prisma.midia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ titulo: expect.objectContaining({ contains: "Berserk" }) }) }),
      );
    });

    it("sem relacionada com pôster → null", async () => {
      const prisma = { midia: { findMany: vi.fn(async () => []) } };
      const capa = await capaObraRelacionada(prisma as unknown as import("@prisma/client").PrismaClient, "Xyz");
      expect(capa).toBeNull();
    });
  });

  describe("COMIC/LIVRO fallback → OpenLibrary", () => {
    it("sucesso: cover_i → covers.openlibrary.org", async () => {
      mockFetch(() => Promise.resolve(jsonRes({ docs: [{ cover_i: 123456 }] })));
      const capa = await capaOpenLibrary("Watchmen");
      expect(capa).toBe("https://covers.openlibrary.org/b/id/123456-L.jpg");
    });

    it("sem cover_i → null (placeholder mantido)", async () => {
      mockFetch(() => Promise.resolve(jsonRes({ docs: [{ isbn: ["978"] }] })));
      const capa = await capaOpenLibrary("Watchmen");
      expect(capa).toBeNull();
    });
  });
});
