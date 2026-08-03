import { describe, it, expect } from "vitest";
import { slugify } from "../src/common/slugify.js";

describe("slugify() (URL amigável canônica)", () => {
  it("lowercase e hífens para espaços", () => {
    expect(slugify("The Godfather")).toBe("the-godfather");
  });

  it("remove acentos (NFD)", () => {
    expect(slugify("O Poderoso Chefão")).toBe("o-poderoso-chefao");
    expect(slugify("Ação e Aventura")).toBe("acao-e-aventura");
  });

  it("remove caracteres especiais", () => {
    expect(slugify("100%: Legenda Urbana!")).toBe("100-legenda-urbana");
    expect(slugify("Star Wars: Episódio IV")).toBe("star-wars-episodio-iv");
  });

  it("sem hífens nas pontas", () => {
    expect(slugify("  Zelda  ")).toBe("zelda");
  });

  it("detecta igualdade entre slugs com acento e sem acento", () => {
    expect(slugify("O Poderoso Chefão")).toBe(slugify("o-poderoso-chefao"));
  });

  it("string vazia ou só símbolos", () => {
    expect(slugify("!!!")).toBe("");
  });
});
