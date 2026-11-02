import { describe, expect, it } from "vitest";
import { mapearPreviews } from "@/components/catalog/usePreviewsPorTipo";

/**
 * Previews por tipo em UMA requisição (spec §11, P2 — antes seis `getCatalog`).
 *
 * O mapeamento é a parte silenciosa: a API responde com o enum do banco
 * (`FILME`, `SERIE`, ...) e o app trabalha com `movie`, `series`. Uma chave trocada aqui
 * faria uma fileira inteira desaparecer **sem quebrar nada visivelmente** — o componente
 * omite seção vazia por desenho.
 */
describe("mapearPreviews", () => {
  it("traduz os seis tipos para as chaves do app", () => {
    const payload = {
      FILME: [{ id: "1", titulo: "A" }],
      SERIE: [{ id: "2", titulo: "B" }],
      GAME: [{ id: "3", titulo: "C" }],
      LIVRO: [{ id: "4", titulo: "D" }],
      COMIC: [{ id: "5", titulo: "E" }],
      MANGA: [{ id: "6", titulo: "F" }],
    };
    const previas = mapearPreviews(payload);
    expect(Object.keys(previas)).toHaveLength(6);
    expect(previas.movie?.[0]).toMatchObject({ id: "1" });
    expect(previas.manga?.[0]).toMatchObject({ id: "6" });
  });

  it("preserva lista vazia (tipo sem acervo some da tela, mas não inventa item)", () => {
    const previas = mapearPreviews({ FILME: [], SERIE: [{ id: "2" }] });
    expect(previas.movie).toEqual([]);
    expect(previas.series).toHaveLength(1);
    expect(previas.game).toBeUndefined();
  });

  it("tolera payload vazio ou ausente (API antiga durante deploy)", () => {
    expect(mapearPreviews({})).toEqual({});
    expect(mapearPreviews(undefined)).toEqual({});
  });

  it("ignora chave desconhecida", () => {
    const previas = mapearPreviews({ ANIME: [{ id: "9" }], FILME: [{ id: "1" }] });
    expect(Object.keys(previas)).toEqual(["movie"]);
  });
});
