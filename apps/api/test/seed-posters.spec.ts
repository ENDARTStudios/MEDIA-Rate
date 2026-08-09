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

import { urlSegura, capaIgdb, capaGoogleBooks, capaJikan, capaOpenLibrary } from "../prisma/seed-posters.js";

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
    it("sucesso: usa token e retorna cover https (cover.url com //)", async () => {
      let chamadas = 0;
      mockFetch((url) => {
        chamadas++;
        if (url.includes("id.twitch.tv")) {
          return Promise.resolve(jsonRes({ access_token: "tok123", expires_in: 3600 }));
        }
        return Promise.resolve(jsonRes([{ id: 588, cover: { url: "//images.igdb.com/igdb/image/upload/t_cover_big/gta5.jpg" } }]));
      });
      process.env.TWITCH_CLIENT_ID = "cid";
      process.env.TWITCH_CLIENT_SECRET = "sec";

      const capa = await capaIgdb("588", "Grand Theft Auto V");

      expect(chamadas).toBe(2);
      expect(capa).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big/gta5.jpg");
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
