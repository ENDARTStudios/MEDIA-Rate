import { describe, expect, it } from "vitest";
import {
  condicaoGeneros,
  condicaoTipo,
  parseGeneros,
  parseTipos,
} from "../src/modules/media/filtros-lista.js";

/**
 * Filtros de múltipla escolha do catálogo.
 *
 * O desenho pede caixas de seleção em Tipo e Gênero; a API aceitava **um** valor por
 * filtro. O contrato passou a aceitar lista separada por vírgula, e este spec fixa as
 * três coisas que não podem regredir:
 *
 *  1. **compatibilidade**: valor único continua produzindo a mesma consulta de antes;
 *  2. **aliases legados** (HQ→COMIC, ANIME→MANGA) seguem resolvidos;
 *  3. **valor inválido é ignorado** — nunca vira `in: []`, que devolveria catálogo vazio
 *     por causa de um parâmetro mal digitado na URL.
 */
describe("filtros de lista — tipo", () => {
  it("mantém o valor único como igualdade simples", () => {
    const tipos = parseTipos("FILME");
    expect(tipos).toEqual(["FILME"]);
    expect(condicaoTipo(tipos)).toBe("FILME");
  });

  it("aceita lista separada por vírgula", () => {
    const tipos = parseTipos("FILME, SERIE, livro");
    expect(tipos).toEqual(["FILME", "SERIE", "LIVRO"]);
    expect(condicaoTipo(tipos)).toEqual({ in: ["FILME", "SERIE", "LIVRO"] });
  });

  it("resolve aliases legados", () => {
    expect(parseTipos("HQ")).toEqual(["COMIC"]);
    expect(parseTipos("anime")).toEqual(["MANGA"]);
    expect(parseTipos("HQ,ANIME")).toEqual(["COMIC", "MANGA"]);
  });

  it("descarta valores inválidos sem zerar o filtro", () => {
    expect(parseTipos("FILME,BANANA")).toEqual(["FILME"]);
    expect(parseTipos("BANANA")).toEqual([]);
    // sem nenhum valor válido, o filtro simplesmente não é aplicado
    expect(condicaoTipo([])).toBeUndefined();
  });

  it("não repete valor (a URL pode vir duplicada)", () => {
    expect(parseTipos("FILME,FILME,HQ,COMIC")).toEqual(["FILME", "COMIC"]);
  });
});

describe("filtros de lista — gênero", () => {
  it("separa slugs de ids numéricos", () => {
    expect(parseGeneros("drama,12,acao")).toEqual({ slugs: ["drama", "acao"], ids: [12] });
  });

  it("mantém compatibilidade com slug único e id único", () => {
    expect(condicaoGeneros(parseGeneros("drama"))).toEqual({
      some: { genero: { slug: "drama" } },
    });
    expect(condicaoGeneros(parseGeneros("12"))).toEqual({ some: { genero: { id: 12 } } });
  });

  it("usa in quando há mais de um slug", () => {
    expect(condicaoGeneros(parseGeneros("drama,acao"))).toEqual({
      some: { genero: { slug: { in: ["drama", "acao"] } } },
    });
  });

  it("usa OR quando mistura slug e id", () => {
    expect(condicaoGeneros(parseGeneros("drama,12"))).toEqual({
      some: {
        genero: {
          OR: [{ slug: "drama" }, { id: 12 }],
        },
      },
    });
  });

  it("sem valor não aplica filtro", () => {
    expect(condicaoGeneros(parseGeneros(undefined))).toBeUndefined();
    expect(condicaoGeneros(parseGeneros(""))).toBeUndefined();
    expect(condicaoGeneros(parseGeneros(" , "))).toBeUndefined();
  });
});
