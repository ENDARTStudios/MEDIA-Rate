import { describe, expect, it } from "vitest";
import { isLocalSource, isUnoptimizedSource, localSrcSet } from "@/lib/image-policy";
import nextConfig from "../next.config";

describe("image-policy (T032/D-445)", () => {
  it("hosts externos da lista → unoptimized", () => {
    for (const src of [
      "https://s4.anilist.co/img.jpg",
      "https://covers.openlibrary.org/b/id/1-L.jpg",
      "https://cdn.myanimelist.net/img.jpg",
      "https://comicvine.gamespot.com/img.jpg",
      "https://static.comicvine.com/img.jpg",
      // Token "googlebooks" preservado do Shell (semantica identica);
      // ver teste de gap abaixo para books.google.com.
      "https://cdn.example.com/googlebooks/x.jpg",
    ]) {
      expect(isUnoptimizedSource(src)).toBe(true);
    }
  });

  it("gap conhecido: books.google.com NAO casa com nenhum token (comportamento do Shell, inalterado)", () => {
    // Capas reais do Google Books (seed-posters: thumbnail da API) usam
    // books.google.com/books/content — sem o substring "googlebooks".
    // Candidato a decisao do Thinker: token "books.google" (host ja
    // allowlisted em remotePatterns) — fora do escopo de T032 (restricao 7).
    expect(isUnoptimizedSource("https://books.google.com/books/content?id=x")).toBe(false);
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
