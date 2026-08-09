import { describe, it, expect } from "vitest";
import { parseSlugDiscriminado, slugify } from "../src/common/slugify.js";

/**
 * T251 — slugs discriminados "{slug}-{tipo}" para desambiguar colisões
 * (Berserk MANGA e SERIE, Duna LIVRO e FILME compartilham o slug).
 */

describe("parseSlugDiscriminado (T251)", () => {
  it("berserk-manga → { slug: 'berserk', tipo: 'MANGA' }", () => {
    expect(parseSlugDiscriminado("berserk-manga")).toEqual({ slug: "berserk", tipo: "MANGA" });
  });

  it("duna-livro → { slug: 'duna', tipo: 'LIVRO' }", () => {
    expect(parseSlugDiscriminado("duna-livro")).toEqual({ slug: "duna", tipo: "LIVRO" });
  });

  it("duna-filme → { slug: 'duna', tipo: 'FILME' }", () => {
    expect(parseSlugDiscriminado("duna-filme")).toEqual({ slug: "duna", tipo: "FILME" });
  });

  it("berserk-serie → { slug: 'berserk', tipo: 'SERIE' }", () => {
    expect(parseSlugDiscriminado("berserk-serie")).toEqual({ slug: "berserk", tipo: "SERIE" });
  });

  it("slug puro (duna) → { slug: 'duna', tipo: null }", () => {
    expect(parseSlugDiscriminado("duna")).toEqual({ slug: "duna", tipo: null });
  });

  it("slug com hífen real (um-sonho-de-liberdade) → sem sufixo reconhecido, tipo null", () => {
    const r = parseSlugDiscriminado("um-sonho-de-liberdade");
    expect(r.tipo).toBeNull();
    expect(r.slug).toBe("um-sonho-de-liberdade");
  });

  it("hq → COMIC (alias)", () => {
    expect(parseSlugDiscriminado("watchmen-hq")).toEqual({ slug: "watchmen", tipo: "COMIC" });
  });

  it("sufixo desconhecido → tipo null (não quebra slug com hífen)", () => {
    const r = parseSlugDiscriminado("matrix-reloaded");
    expect(r.tipo).toBeNull();
    expect(r.slug).toBe("matrix-reloaded");
  });

  it("slugify mantém determinismo (sem acentos, hífens)", () => {
    expect(slugify("Ação & Drama")).toBe("acao-drama");
    expect(slugify("Um Sonho de Liberdade")).toBe("um-sonho-de-liberdade");
  });
});
