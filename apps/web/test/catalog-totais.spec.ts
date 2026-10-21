import { describe, expect, it } from "vitest";
import { mapearTotais, TIPOS_DO_CATALOGO } from "@/components/catalog/useTiposComContagem";

/**
 * Contagem por tipo em UMA requisição (spec §11, P2 — antes eram seis `limit=1`).
 *
 * O que o teste fixa é o MAPEAMENTO, que é a parte onde um erro passa silencioso: a API
 * fala o enum do banco (`FILME`, `SERIE`, ...) e o app fala `movie`, `series`. Trocar uma
 * chave faria a contagem sumir do lado errado sem quebrar nada visivelmente.
 */
describe("mapearTotais", () => {
  it("traduz os seis tipos do enum da API para as chaves do app", () => {
    const totais = mapearTotais({
      FILME: 9158,
      SERIE: 1840,
      GAME: 4996,
      LIVRO: 651,
      COMIC: 31,
      MANGA: 541,
    });
    expect(totais).toEqual({
      movie: 9158,
      series: 1840,
      game: 4996,
      book: 651,
      comic: 31,
      manga: 541,
    });
    expect(Object.keys(totais)).toHaveLength(TIPOS_DO_CATALOGO.length);
  });

  it("ignora tipo sem contagem em vez de inventar zero", () => {
    const totais = mapearTotais({ FILME: 10 });
    expect(totais.movie).toBe(10);
    expect(totais.book).toBeUndefined();
  });

  it("tolera payload vazio (API antiga durante deploy)", () => {
    expect(mapearTotais({})).toEqual({});
    expect(mapearTotais(undefined)).toEqual({});
  });

  it("ignora chave desconhecida da API", () => {
    const totais = mapearTotais({ ANIME: 99, FILME: 5 });
    expect(totais).toEqual({ movie: 5 });
  });
});
