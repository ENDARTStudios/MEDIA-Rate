import { describe, expect, it } from "vitest";
import {
  displaySrc,
  isLocalSource,
  isUnoptimizedSource,
  localSrcSet,
  remoteLadder,
} from "@/lib/image-policy";
import nextConfig from "../next.config";

describe("image-policy (T032/D-445)", () => {
  it("hosts externos da lista → unoptimized", () => {
    for (const src of [
      "https://s4.anilist.co/img.jpg",
      "https://covers.openlibrary.org/b/id/1-L.jpg",
      "https://cdn.myanimelist.net/img.jpg",
      "https://comicvine.gamespot.com/img.jpg",
      "https://static.comicvine.com/img.jpg",
      // Token "googlebooks" preservado do Shell (semantica identica).
      "https://cdn.example.com/googlebooks/x.jpg",
    ]) {
      expect(isUnoptimizedSource(src)).toBe(true);
    }
  });

  it("gap T032 absorvido em T036: books.google.com agora é unoptimized", () => {
    // Token "books.google" (D-447); ver teste dedicado no bloco remoteLadder.
    expect(isUnoptimizedSource("https://books.google.com/books/content?id=x")).toBe(true);
  });

  it("TMDB/IGDB/local/vazio → otimizado", () => {
    for (const src of [
      "https://image.tmdb.org/t/p/w500/x.jpg",
      "https://images.igdb.com/igdb/image/upload/t_cover_big/x.jpg",
      "/uploads/media/abc/img.webp",
      null,
      undefined,
      "",
    ]) {
      expect(isUnoptimizedSource(src)).toBe(false);
    }
  });

  it("case-insensitive", () => {
    expect(isUnoptimizedSource("https://S4.ANILIST.CO/X.JPG")).toBe(true);
  });

  it("config de images travada (tokens D-445)", () => {
    const images = (nextConfig as { images?: Record<string, unknown> }).images ?? {};
    expect(images.deviceSizes).toEqual([320, 640, 960, 1280, 1920]);
    expect(images.imageSizes).toEqual([64, 128, 256]);
    expect(images.formats).toEqual(["image/webp"]);
    expect(images.qualities).toEqual([75]);
  });

  it("snapshot da config de images", () => {
    expect((nextConfig as { images?: unknown }).images).toMatchSnapshot();
  });

  it("T031: isLocalSource — só caminho local single-slash", () => {
    expect(isLocalSource("/uploads/media/abc/123e4567-e89b-12d3-a456-426614174000.jpg")).toBe(true);
    expect(isLocalSource("https://image.tmdb.org/t/p/w500/x.jpg")).toBe(false);
    expect(isLocalSource("//cdn.example.com/x.jpg")).toBe(false);
    expect(isLocalSource(null)).toBe(false);
    expect(isLocalSource("")).toBe(false);
  });

  it("T031: localSrcSet deriva a ladder <uuid>-w{w}.webp", () => {
    expect(localSrcSet("/uploads/media/abc/123e4567-e89b-12d3-a456-426614174000.jpg")).toBe(
      "/uploads/media/abc/123e4567-e89b-12d3-a456-426614174000-w320.webp 320w, " +
        "/uploads/media/abc/123e4567-e89b-12d3-a456-426614174000-w640.webp 640w, " +
        "/uploads/media/abc/123e4567-e89b-12d3-a456-426614174000-w960.webp 960w",
    );
  });
});

describe("remoteLadder (T036/D-447)", () => {
  it("TMDB: w342/w780 + src original", () => {
    expect(remoteLadder("https://image.tmdb.org/t/p/w500/abc.jpg")).toEqual({
      src: "https://image.tmdb.org/t/p/original/abc.jpg",
      srcSet:
        "https://image.tmdb.org/t/p/w342/abc.jpg 342w, " +
        "https://image.tmdb.org/t/p/w780/abc.jpg 780w",
    });
  });

  it("IGDB: cover_small/big/2x (tamanhos documentados da API)", () => {
    expect(remoteLadder("https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg")).toEqual({
      src: "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/abc.jpg",
      srcSet:
        "https://images.igdb.com/igdb/image/upload/t_cover_small/abc.jpg 90w, " +
        "https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg 264w, " +
        "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/abc.jpg 528w",
    });
  });

  it("IGDB legado t_thumb também vira ladder (bônus: aposenta a miniatura 90px)", () => {
    const ladder = remoteLadder("https://images.igdb.com/igdb/image/upload/t_thumb/abc.jpg");
    expect(ladder?.src).toContain("t_cover_big_2x");
    expect(ladder?.srcSet).toContain("t_cover_big");
  });

  it("OpenLibrary: -S/-M/-L (larguras nominais, ordem correta)", () => {
    expect(remoteLadder("https://covers.openlibrary.org/b/id/123-L.jpg")).toEqual({
      src: "https://covers.openlibrary.org/b/id/123-L.jpg",
      srcSet:
        "https://covers.openlibrary.org/b/id/123-S.jpg 128w, " +
        "https://covers.openlibrary.org/b/id/123-M.jpg 256w, " +
        "https://covers.openlibrary.org/b/id/123-L.jpg 512w",
    });
  });

  it("Google Books: zoom=0/1 preservando a query original", () => {
    const input =
      "https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1&source=gbs_api";
    expect(remoteLadder(input)).toEqual({
      src: input,
      srcSet:
        "https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&source=gbs_api&zoom=0 128w, " +
        "https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&source=gbs_api&zoom=1 512w",
    });
  });

  it("sem ladder pública (steam/wikimedia) ou local → null (fallback unoptimized)", () => {
    expect(remoteLadder("https://cdn.akamai.steamstatic.com/steam/apps/1/header.jpg")).toBeNull();
    expect(remoteLadder("https://upload.wikimedia.org/wikipedia/x.jpg")).toBeNull();
    expect(remoteLadder("/uploads/media/abc/x.jpg")).toBeNull();
    expect(remoteLadder(null)).toBeNull();
  });

  it("books.google entra em isUnoptimizedSource (gap T032 absorvido)", () => {
    expect(isUnoptimizedSource("https://books.google.com/books/content?id=x")).toBe(true);
  });

  it("snapshot das ladders por fonte", () => {
    expect(
      [
        "https://image.tmdb.org/t/p/w500/abc.jpg",
        "https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg",
        "https://covers.openlibrary.org/b/id/123-L.jpg",
        "https://books.google.com/books/content?id=abc&img=1&zoom=1",
      ].map(remoteLadder),
    ).toMatchSnapshot();
  });
});

describe("displaySrc — variante única (T447/D-441)", () => {
  it("local: menor rung >= 300 (w320)", () => {
    expect(displaySrc("/uploads/media/abc/x.jpg")).toBe("/uploads/media/abc/x-w320.webp");
  });

  it("TMDB: w342 para card 300px; original nunca é servido no card", () => {
    const src = displaySrc("https://image.tmdb.org/t/p/w500/abc.jpg");
    expect(src).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  });

  it("IGDB: pula rungs menores que o alvo (264 < 300 → 528)", () => {
    expect(displaySrc("https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg")).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/abc.jpg",
    );
  });

  it("sem ladder → null (componente usa fallback unoptimized)", () => {
    expect(displaySrc("https://cdn.akamai.steamstatic.com/steam/apps/1/header.jpg")).toBeNull();
    expect(displaySrc(null)).toBeNull();
    expect(displaySrc("")).toBeNull();
  });

  it("alvo maior que todos os rungs → maior disponível (sem upscale visual além do rung)", () => {
    expect(displaySrc("https://image.tmdb.org/t/p/w500/abc.jpg", 5000)).toBe(
      "https://image.tmdb.org/t/p/w780/abc.jpg",
    );
  });
});
