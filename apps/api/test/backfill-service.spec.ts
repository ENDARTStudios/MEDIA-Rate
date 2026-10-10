/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import {
  BackfillService,
  truncarCampo,
  LIMITES,
  mapearMetadados,
  mapearListaTemporadas,
  mapearEpisodios,
  arestasSequencia,
  slugBaseFranquia,
} from "../src/modules/admin/backfill.service.js";

/**
 * T178 (D-576) — backfills em processo: mappers portados dos scripts T164/T165
 * e fluxo do serviço (guard de disco, estado por job, upserts idempotentes,
 * alvo filtrado por lacuna).
 */

vi.mock("../src/modules/media-score/adapters/http.utils.js", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, fetchJson: vi.fn() };
});

import { fetchJson } from "../src/modules/media-score/adapters/http.utils.js";

function makeService(over: any = {}) {
  const prisma = {
    $queryRawUnsafe: vi.fn(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      return over.alvo ?? [];
    }),
    midiaElenco: { upsert: vi.fn(async ({ create }: any) => create) },
    midiaProdutora: { upsert: vi.fn(async ({ create }: any) => create) },
    midia: { update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 0 })) },
    temporada: { upsert: vi.fn(async ({ create }: any) => ({ id: "t1", ...create })) },
    episodio: { upsert: vi.fn(async () => ({})) },
    franquia: { findFirst: vi.fn(async () => ({ id: "f1" })), create: vi.fn() },
    midiaFranquia: { upsert: vi.fn(async () => ({})) },
    relacaoObra: { findFirst: vi.fn(async () => null), create: vi.fn() },
  };
  const svc = new BackfillService(prisma as any);
  return { svc, prisma };
}

describe("mapearMetadados (T178)", () => {
  it("filme: elenco (15), produtoras dedupe, backdrop e país", () => {
    const cast = Array.from({ length: 20 }, (_, i) => ({
      id: 100 + i,
      name: `Ator ${i}`,
      character: `P${i}`,
      order: i,
      profile_path: i === 0 ? "/p.jpg" : null,
    }));
    const r = mapearMetadados(
      {
        credits: { cast },
        production_companies: [
          { id: 33, name: "Universal" },
          { id: 33, name: "Universal" },
        ],
        production_countries: [{ iso_3166_1: "US" }],
        backdrop_path: "/b.jpg",
      },
      "FILME",
    );
    expect(r.elenco).toHaveLength(15);
    expect(r.elenco[0]).toMatchObject({ fonte_id: "100", nome: "Ator 0", personagem: "P0" });
    expect(r.produtoras).toEqual([{ fonte_id: "33", nome: "Universal", papel: "PRODUTORA" }]);
    expect(r.backdrop_url).toBe("https://image.tmdb.org/t/p/w1280/b.jpg");
    expect(r.pais_origem).toBe("US");
  });

  it("série: aggregate_credits com primeiro papel + networks", () => {
    const r = mapearMetadados(
      {
        aggregate_credits: {
          cast: [
            { id: 7, name: "Bryan Cranston", roles: [{ character: "Walter White" }], order: 0 },
          ],
        },
        networks: [{ id: 70, name: "AMC" }],
        origin_country: ["US"],
      },
      "SERIE",
    );
    expect(r.elenco[0]).toMatchObject({ nome: "Bryan Cranston", personagem: "Walter White" });
    expect(r.produtoras).toContainEqual({ fonte_id: "70", nome: "AMC", papel: "NETWORK" });
  });
});

describe("mapearListaTemporadas / mapearEpisodios / arestasSequencia (T178)", () => {
  it("temporadas exibidas ordenadas; especiais fora", () => {
    const r = mapearListaTemporadas({
      seasons: [
        { season_number: 0, name: "Especiais", air_date: "2010-01-01" },
        { season_number: 1, name: "T1", air_date: "2011-04-17" },
        { season_number: 2, name: "T2", air_date: null },
      ],
    });
    expect(r).toEqual([{ numero: 1, titulo: "T1", ano: 2011, poster_url: null }]);
  });

  it("episódio com vote_average 0 → nota null (não fabrica)", () => {
    const r = mapearEpisodios({
      episodes: [
        { episode_number: 1, name: "Piloto", air_date: "2008-01-19", vote_average: 8.5 },
        { episode_number: 2, name: "EP2", air_date: null, vote_average: 0 },
      ],
    });
    expect(r[0].nota_publico).toBe(8.5);
    expect(r[1].nota_publico).toBeNull();
    expect(r[1].data_exibicao).toBeNull();
  });

  it("arestas conectam consecutivos por ano", () => {
    expect(
      arestasSequencia([
        { id: "c", ano: 2003 },
        { id: "a", ano: 2001 },
        { id: "b", ano: 2002 },
      ]),
    ).toEqual([
      { anteriorId: "a", sequenciaId: "b" },
      { anteriorId: "b", sequenciaId: "c" },
    ]);
  });

  it("slugBaseFranquia remove sufixo de coleção", () => {
    expect(slugBaseFranquia("Duna: Coleção")).toBe("duna");
  });
});

describe("BackfillService.enriquecerMetadados (T178)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TMDB_API_KEY = "chave-de-teste";
  });

  it("processa alvo filtrado por lacuna com upserts e atualiza estado", async () => {
    const alvo = [{ id: "m-1", tipo: "FILME", fonte_id: "693134", titulo: "Duna: Parte Dois" }];
    const { svc, prisma } = makeService({ alvo });
    (fetchJson as any).mockResolvedValue({
      credits: { cast: [{ id: 1, name: "Timothée", character: "Paul", order: 0 }] },
      production_companies: [{ id: 33, name: "Legendary" }],
      production_countries: [{ iso_3166_1: "US" }],
      backdrop_path: "/d.jpg",
    });
    const r = await svc.enriquecerMetadados(100);
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    expect(prisma.midiaElenco.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.midia.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m-1" },
        data: expect.objectContaining({
          backdrop_url: "https://image.tmdb.org/t/p/w1280/d.jpg",
          pais_origem: "US",
        }),
      }),
    );
    const st = svc.status().metadados;
    expect(st.executando).toBe(false);
    expect(st.ok).toBe(1);
    expect(() => JSON.stringify(svc.status())).not.toThrow();
  });

  it("guard de disco bloqueia (D-574) e job em execução não re-entra", async () => {
    const alvo = [{ id: "m-1", tipo: "FILME", fonte_id: "1", titulo: "X" }];
    const { svc, prisma } = makeService({ alvo });
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 5000000000n }];
      return alvo;
    });
    await expect(svc.enriquecerMetadados(10)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("truncarCampo (T180)", () => {
  it("curto passa intacto; longo é cortado no limite com reticências", () => {
    expect(truncarCampo("Homer Simpson", 160)).toBe("Homer Simpson");
    const longo = Array.from({ length: 40 }, (_, i) => `Papel ${i}`).join(" / ");
    expect(longo.length).toBeGreaterThan(160);
    const r = truncarCampo(longo, LIMITES.elencoPersonagem) ?? "";
    expect(r).not.toBe("");
    expect(r.length).toBeLessThanOrEqual(160);
    expect(r.endsWith("…")).toBe(true);
    expect(r.startsWith("Papel 0 / Papel 1")).toBe(true);
  });

  it("null/vazio → null (não grava lixo)", () => {
    expect(truncarCampo(null, 10)).toBeNull();
    expect(truncarCampo("   ", 10)).toBeNull();
    expect(truncarCampo(undefined, 10)).toBeNull();
  });

  it("personagem multi-papel de 300 chars do TMDB cabe no limite da coluna", () => {
    // Caso real (Os Simpsons: O Filme — Dan Castellaneta).
    const real =
      "Homer Simpson / Itchy / Barney / Abe Simpson / Stage Manager / Krusty the Clown / Mayor Quimby / Mayor's Aide / Multi-Eyed Squirrel / Panicky Man / Sideshow Mel / Mr. Teeny / EPA Official / Kissing Cop / Bear / Boy / Goat / Russ Cargill / NSA Worker";
    expect(real.length).toBeGreaterThan(LIMITES.elencoPersonagem);
    const cortado = truncarCampo(real, LIMITES.elencoPersonagem) ?? "";
    expect(cortado.length).toBeLessThanOrEqual(160);
    expect(cortado.length).toBeGreaterThan(0);
  });
});
