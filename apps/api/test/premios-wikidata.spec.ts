import { describe, it, expect } from "vitest";
import { normalizarOrg, mapearBindings, planear } from "../scripts/seed-premios-wikidata.mjs";

/**
 * T169 — prêmios em escala via Wikidata: normalização de cerimônia para o
 * dedupe editorial (curadoria T167 vence), mapeamento de bindings (só com
 * ano, dedupe por id+award+ano) e plano com cap por mídia.
 */

describe("normalizarOrg (T169)", () => {
  it("mapas das cerimônias principais (pt e en)", () => {
    expect(normalizarOrg("Prémios Emmy do Primetime")).toBe("emmy");
    expect(normalizarOrg("Academy of Motion Picture Arts and Sciences")).toBe("oscar");
    expect(normalizarOrg("Academy Award for Best Picture")).toBe("oscar");
    expect(normalizarOrg("Golden Globe Award")).toBe("goldenglobe");
    expect(normalizarOrg("BAFTA Games")).toBe("bafta");
    expect(normalizarOrg("The Game Awards")).toBe("tga");
    expect(normalizarOrg("Oscar")).toBe("oscar");
  });

  it("desconhecida → slug curtinho estável; vazia → outros", () => {
    expect(normalizarOrg("Prémio Peabody")).toBe("premiopeabody");
    expect(normalizarOrg("")).toBe("outros");
  });
});

describe("mapearBindings (T169)", () => {
  const bindings = [
    {
      imdb: { value: "tt0903747" },
      awardLabel: { value: "Primetime Emmy Award de melhor série dramática" },
      ano: { value: "2014" },
      parteDeLabel: { value: "Prémios Emmy do Primetime" },
    },
    {
      imdb: { value: "tt0903747" },
      awardLabel: { value: "Primetime Emmy Award de melhor série dramática" },
      ano: { value: "2014" },
      parteDeLabel: { value: "Prémios Emmy do Primetime" },
    },
    { imdb: { value: "tt0111161" }, awardLabel: { value: "Q123456" }, ano: { value: "1995" } },
    { imdb: { value: "tt0111161" }, awardLabel: { value: "Prémio Peabody" }, ano: null },
  ];

  it("só com ano e label; dedupe id+award+ano; org = cerimônia || Outros", () => {
    const r = mapearBindings(bindings);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({
      id: "tt0903747",
      nome: "Primetime Emmy Award de melhor série dramática",
      organizacao: "Prémios Emmy do Primetime",
      ano: 2014,
    });
    expect(() => JSON.stringify(r)).not.toThrow();
  });
});

describe("planear (T169)", () => {
  const midiaPorId = new Map([
    ["tt0903747", { midiaId: "m-bb", titulo: "Breaking Bad" }],
    ["tt9999999", { midiaId: "m-x", titulo: "Inexistente no mapa" }],
  ]);
  const premios = [
    {
      id: "tt0903747",
      nome: "Emmy de melhor série dramática",
      organizacao: "Prémios Emmy do Primetime",
      ano: 2014,
    },
    { id: "tt0903747", nome: "Saturn Award", organizacao: "Saturn Awards", ano: 2013 },
    { id: "tt9999999", nome: "Qualquer", organizacao: "Outros", ano: 2020 },
  ];

  it("dedupe editorial: cerimônia que a mídia já tem (curadoria) é pulada", () => {
    const comEmmy = new Map([["m-bb", new Set(["emmy"])]]);
    const { plano, puladosOrg } = planear(premios, midiaPorId, comEmmy);
    // Emmy pulada (curadoria vence); Saturn entra; m-x (Outros) entra.
    expect(plano).toHaveLength(2);
    expect(plano[0]).toMatchObject({ midiaId: "m-bb", nome: "Saturn Award", venceu: true });
    expect(puladosOrg).toBe(1);
  });

  it("sem cerimônia prévia, tudo entra", () => {
    const { plano } = planear(premios, midiaPorId, new Map());
    expect(plano).toHaveLength(3);
  });

  it("id sem mídia correspondente é ignorado", () => {
    const soBB = new Map([["tt0903747", { midiaId: "m-bb", titulo: "Breaking Bad" }]]);
    const { plano } = planear(premios, soBB, new Map());
    expect(plano).toHaveLength(2);
    expect(plano.every((p) => p.midiaId === "m-bb")).toBe(true);
  });

  it("cap de 25 prêmios por mídia", () => {
    const muitos = Array.from({ length: 30 }, (_, i) => ({
      id: "tt0903747",
      nome: `Prêmio ${i}`,
      organizacao: `Org ${i}`,
      ano: 2000 + i,
    }));
    const { plano } = planear(muitos, midiaPorId, new Map());
    expect(plano).toHaveLength(25);
  });
});
