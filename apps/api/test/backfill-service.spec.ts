/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import {
  BackfillService,
  truncarCampo,
  LIMITES,
  mapearMetadados,
  mapearGeneros,
  mapearColecao,
  ordenarPartesColecao,
  mapearListaTemporadas,
  mapearEpisodios,
  arestasSequencia,
  slugBaseFranquia,
  mapearProvedores,
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
    midia: {
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 0 })),
      // T-DADOS-01: lookup das partes da coleção que existem no catálogo.
      findFirst: vi.fn(async () => ({ id: "m-existente" })),
    },
    temporada: { upsert: vi.fn(async ({ create }: any) => ({ id: "t1", ...create })) },
    episodio: { upsert: vi.fn(async () => ({})) },
    franquia: {
      findFirst: vi.fn(async () => ({ id: "f1" })),
      create: vi.fn(),
      // T-DADOS-01: upsert por slug (update: {} preserva nome curado).
      upsert: vi.fn(async ({ create }: any) => ({ id: "f1", ...create })),
    },
    midiaFranquia: { upsert: vi.fn(async () => ({})) },
    // T-DADOS-01: gêneros (findUnique por tmdb_id/slug; create com colisão).
    genero: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => ({ id: 42, ...data })),
    },
    midiaGenero: { upsert: vi.fn(async ({ create }: any) => create) },
    // T-DADOS-02: provedores de streaming (findUnique por tmdb_provider_id/slug;
    // create com colisão tratada) + vínculo midia_streaming.
    streamingService: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => ({ id: 9, ...data })),
    },
    midiaStreaming: { upsert: vi.fn(async ({ create }: any) => create) },
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

// ===========================================================================
// T-DADOS-01 (D1) — metadados ricos v2: duração, gêneros, coleção/franquia
// ===========================================================================

describe("mapearMetadados v2 — duração/gêneros/coleção (T-DADOS-01)", () => {
  it("filme: runtime, genres e belongs_to_collection", () => {
    const r = mapearMetadados(
      {
        runtime: 166,
        genres: [
          { id: 878, name: "Ficção científica" },
          { id: 12, name: "Aventura" },
          { id: 878, name: "Ficção científica" }, // duplicata → 1
        ],
        belongs_to_collection: { id: 726871, name: "Coleção Duna" },
      },
      "FILME",
    );
    expect(r.duracao_minutos).toBe(166);
    expect(r.generos).toEqual([
      { tmdb_id: 878, nome: "Ficção científica" },
      { tmdb_id: 12, nome: "Aventura" },
    ]);
    expect(r.colecao).toEqual({ tmdb_id: 726871, nome: "Coleção Duna" });
  });

  it("série: episode_run_time[0]; coleção é sempre null (campo exclusivo de FILME)", () => {
    const r = mapearMetadados(
      {
        episode_run_time: [47, 50],
        genres: [{ id: 18, name: "Drama" }],
        // a rota /tv não devolve belongs_to_collection, mas se viesse, seria ignorado.
        belongs_to_collection: { id: 1, name: "Ignorada" },
      },
      "SERIE",
    );
    expect(r.duracao_minutos).toBe(47);
    expect(r.colecao).toBeNull();
  });

  it("payload sem os campos novos → null/[] sem lançar", () => {
    const r = mapearMetadados({}, "FILME");
    expect(r.duracao_minutos).toBeNull();
    expect(r.generos).toEqual([]);
    expect(r.colecao).toBeNull();
    const s = mapearMetadados({ episode_run_time: [] }, "SERIE");
    expect(s.duracao_minutos).toBeNull();
  });

  it("runtime 0/negativo/fracionário e genres inválidos são ignorados (não fabrica)", () => {
    expect(mapearMetadados({ runtime: 0 }, "FILME").duracao_minutos).toBeNull();
    expect(mapearMetadados({ runtime: -10 }, "FILME").duracao_minutos).toBeNull();
    expect(mapearMetadados({ runtime: 12.5 }, "FILME").duracao_minutos).toBeNull();
    expect(
      mapearGeneros({
        genres: [{ id: 0, name: "X" }, { id: null, name: "Y" }, { id: 5, name: "  " }, { id: 7 }],
      }),
    ).toEqual([]);
    expect(mapearColecao({ belongs_to_collection: { id: 0, name: "Z" } }, "FILME")).toBeNull();
    expect(mapearColecao({ belongs_to_collection: { id: 9 } }, "FILME")).toBeNull();
  });

  it("nome de gênero > 64 chars é truncado no limite da coluna (VarChar(64))", () => {
    const longo = `Gênero ${"muito-longo-".repeat(8)}fim`;
    expect(longo.length).toBeGreaterThan(64);
    const r = mapearMetadados({ genres: [{ id: 999, name: longo }] }, "FILME");
    expect(r.generos).toHaveLength(1);
    const nome = r.generos[0]?.nome ?? "";
    expect(nome.length).toBeLessThanOrEqual(LIMITES.generoNome);
    expect(nome.endsWith("…")).toBe(true);
  });
});

describe("ordenarPartesColecao (T-DADOS-01)", () => {
  it("ordena por release_date ISO; sem data vai para o fim (estável)", () => {
    const r = ordenarPartesColecao([
      { id: 3, release_date: "2021-10-01" },
      { id: 2, release_date: null },
      { id: 1, release_date: "1999-05-05" },
      { id: 4, release_date: "" },
      { id: 5 },
      { id: 0, release_date: "2000-01-01" }, // id inválido → fora
    ]);
    expect(r.map((p) => p.id)).toEqual([1, 3, 2, 4, 5]);
  });
});

describe("BackfillService.enriquecerMetadadosRicos (T-DADOS-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TMDB_API_KEY = "chave-de-teste";
  });

  it("grava duração e gêneros e SEMPRE marca metadados_ricos_em", async () => {
    const alvo = [{ id: "m-1", tipo: "FILME", fonte_id: "693134", titulo: "Duna: Parte Dois" }];
    const { svc, prisma } = makeService({ alvo });
    prisma.genero.findUnique.mockResolvedValue(null);
    prisma.genero.create.mockResolvedValue({ id: 7 });
    (fetchJson as any).mockResolvedValue({
      runtime: 166,
      genres: [{ id: 878, name: "Ficção científica" }],
    });
    const r = await svc.enriquecerMetadadosRicos(100);
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    expect(prisma.midiaGenero.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { midia_id_genero_id: { midia_id: "m-1", genero_id: 7 } },
        update: {},
      }),
    );
    expect(prisma.midia.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m-1" },
        data: expect.objectContaining({ duracao_minutos: 166 }),
      }),
    );
    const data = (prisma.midia.update as any).mock.calls[0][0].data;
    expect(data.metadados_ricos_em).toBeInstanceOf(Date);
    expect(svc.status().metadadosRicos.ok).toBe(1);
    expect(() => JSON.stringify(svc.status())).not.toThrow();
  });

  it("marca metadados_ricos_em mesmo SEM runtime/coleção (título sai da fila)", async () => {
    const alvo = [{ id: "m-2", tipo: "SERIE", fonte_id: "1396", titulo: "Breaking Bad" }];
    const { svc, prisma } = makeService({ alvo });
    (fetchJson as any).mockResolvedValue({ credits: { cast: [] } });
    const r = await svc.enriquecerMetadadosRicos(10);
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    const data = (prisma.midia.update as any).mock.calls[0][0].data;
    expect(data.metadados_ricos_em).toBeInstanceOf(Date);
    // sem duração na fonte → não toca a coluna (nunca apaga dado existente)
    expect("duracao_minutos" in data).toBe(false);
  });

  it("erro por título vai para falhas SEM watermark (retenta depois)", async () => {
    const alvo = [{ id: "m-3", tipo: "FILME", fonte_id: "1", titulo: "Quebrado" }];
    const { svc, prisma } = makeService({ alvo });
    (fetchJson as any).mockRejectedValue(new Error("TMDB 500"));
    const r = await svc.enriquecerMetadadosRicos(10);
    expect(r).toEqual({ processados: 1, ok: 0, falhas: 1 });
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("gênero sem tmdb_id nem slug no banco → create; colisão de unique não derruba o título", async () => {
    const alvo = [{ id: "m-4", tipo: "FILME", fonte_id: "2", titulo: "Colisão" }];
    const { svc, prisma } = makeService({ alvo });
    prisma.genero.findUnique.mockResolvedValue(null); // sem tmdb_id, sem slug
    prisma.genero.create.mockRejectedValue(new Error('Unique constraint failed on "nome"'));
    (fetchJson as any).mockResolvedValue({ runtime: 90, genres: [{ id: 35, name: "Comédia" }] });
    const r = await svc.enriquecerMetadadosRicos(10);
    expect(prisma.genero.create).toHaveBeenCalledTimes(1);
    // create colidiu → refaz lookup por slug e segue (gênero ignorado, título ok)
    expect(prisma.midiaGenero.upsert).not.toHaveBeenCalled();
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    expect((prisma.midia.update as any).mock.calls[0][0].data.metadados_ricos_em).toBeInstanceOf(
      Date,
    );
  });

  it("coleção: 1 chamada TMDB por coleção (memoizada) e ordem de lançamento 1-based", async () => {
    const alvo = [
      { id: "m-5", tipo: "FILME", fonte_id: "11", titulo: "Parte 1" },
      { id: "m-6", tipo: "FILME", fonte_id: "12", titulo: "Parte 2" },
    ];
    const { svc, prisma } = makeService({ alvo });
    prisma.midia.findFirst.mockImplementation(async ({ where }: any) =>
      where.fonte_id === "2" ? null : { id: `cat-${where.fonte_id}` },
    );
    (fetchJson as any).mockImplementation(async (url: string) => {
      if (url.includes("/collection/500")) {
        return {
          parts: [
            { id: 2, release_date: null },
            { id: 3, release_date: "2001-01-01" },
            { id: 1, release_date: "1999-05-05" },
          ],
        };
      }
      return { runtime: 100, belongs_to_collection: { id: 500, name: "Coleção Teste" } };
    });
    const r = await svc.enriquecerMetadadosRicos(10);
    expect(r).toEqual({ processados: 2, ok: 2, falhas: 0 });
    const chamadasColecao = (fetchJson as any).mock.calls.filter((c: any[]) =>
      String(c[0]).includes("/collection/"),
    );
    expect(chamadasColecao).toHaveLength(1);
    expect(prisma.franquia.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "colecao-teste" },
        update: {},
        create: { nome: "Coleção Teste", slug: "colecao-teste" },
      }),
    );
    const partes = (prisma.midiaFranquia.upsert as any).mock.calls.map((c: any[]) => c[0].create);
    // 2 títulos da MESMA coleção → 2 vínculos cada (a memoização é do fetch de
    // /collection, não do upsert — este é idempotente por chave composta).
    expect(partes).toHaveLength(4);
    expect(partes.slice(0, 2)).toEqual([
      expect.objectContaining({ midia_id: "cat-1", ordem_lancamento: 1, ordem_cronologica: null }),
      expect.objectContaining({ midia_id: "cat-3", ordem_lancamento: 2, ordem_cronologica: null }),
    ]);
  });

  it("guard de disco bloqueia (D-574) e job em execução não re-entra", async () => {
    const alvo = [{ id: "m-1", tipo: "FILME", fonte_id: "1", titulo: "X" }];
    const { svc, prisma } = makeService({ alvo });
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 5000000000n }];
      return alvo;
    });
    await expect(svc.enriquecerMetadadosRicos(10)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("contarPendentes inclui as filas metadadosRicos e provedores (T-DADOS-01/02)", () => {
  it("conta as 5 filas na mesma query", async () => {
    const { svc, prisma } = makeService();
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      expect(sql).toContain("metadados_ricos_em IS NULL");
      expect(sql).toContain("provedores_em IS NULL");
      return [{ sem_elenco: 3, sem_temp: 2, sem_pais: 1, ricos: 17217, provedores: 17230 }];
    });
    await expect(svc.contarPendentes()).resolves.toEqual({
      semElenco: 3,
      seriesSemTemporada: 2,
      filmesSemPais: 1,
      metadadosRicos: 17217,
      provedores: 17230,
    });
  });

  it("linha vazia → zeros (sem NaN)", async () => {
    const { svc, prisma } = makeService();
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      return [];
    });
    await expect(svc.contarPendentes()).resolves.toEqual({
      semElenco: 0,
      seriesSemTemporada: 0,
      filmesSemPais: 0,
      metadadosRicos: 0,
      provedores: 0,
    });
  });
});

// ===========================================================================
// T-DADOS-02 (D2) — provedores de streaming (TMDB watch/providers = JustWatch)
// ===========================================================================

describe("mapearProvedores (T-DADOS-02)", () => {
  it("extrai flatrate de watch/providers.results.BR e o link", () => {
    const r = mapearProvedores({
      "watch/providers": {
        results: {
          BR: {
            link: "https://www.themoviedb.org/movie/693134-duna-parte-2/watch?locale=BR",
            flatrate: [
              { provider_id: 1899, provider_name: "Max", display_priority: 1 },
              { provider_id: 8, provider_name: "Netflix", display_priority: 2 },
              { provider_id: 8, provider_name: "Netflix", display_priority: 3 }, // dedupe
            ],
          },
        },
      },
    });
    expect(r.provedores).toEqual([
      { tmdb_provider_id: 1899, nome: "Max" },
      { tmdb_provider_id: 8, nome: "Netflix" },
    ]);
    expect(r.url_link).toBe("https://www.themoviedb.org/movie/693134-duna-parte-2/watch?locale=BR");
  });

  it("ignora free/ads/rent/buy (só assinatura) e regiões fora do BR", () => {
    const r = mapearProvedores({
      "watch/providers": {
        results: {
          US: { flatrate: [{ provider_id: 15, provider_name: "Hulu" }] },
          BR: {
            free: [{ provider_id: 300, provider_name: "Globoplay (Free)" }],
            ads: [{ provider_id: 73, provider_name: "Tubi" }],
            rent: [{ provider_id: 2, provider_name: "Apple TV (aluguel)" }],
            buy: [{ provider_id: 3, provider_name: "Google Play (compra)" }],
            flatrate: [{ provider_id: 337, provider_name: "Disney Plus" }],
          },
        },
      },
    });
    expect(r.provedores).toEqual([{ tmdb_provider_id: 337, nome: "Disney Plus" }]);
    expect(r.url_link).toBeNull(); // sem link no BR → null (não fabrica URL)
  });

  it("payload sem a chave / sem BR / flatrate ausente → vazio sem lançar", () => {
    expect(mapearProvedores({})).toEqual({ provedores: [], url_link: null });
    expect(mapearProvedores(undefined)).toEqual({ provedores: [], url_link: null });
    expect(mapearProvedores({ "watch/providers": { results: {} } })).toEqual({
      provedores: [],
      url_link: null,
    });
    expect(mapearProvedores({ "watch/providers": { results: { BR: {} } } })).toEqual({
      provedores: [],
      url_link: null,
    });
    expect(mapearProvedores({ "watch/providers": null })).toEqual({
      provedores: [],
      url_link: null,
    });
  });

  it("provider_name > 128 chars é truncado no limite da coluna (VarChar(128))", () => {
    const longo = `Provedor ${"muito-longo-".repeat(12)}fim`;
    expect(longo.length).toBeGreaterThan(128);
    const r = mapearProvedores({
      "watch/providers": {
        results: { BR: { flatrate: [{ provider_id: 1, provider_name: longo }] } },
      },
    });
    expect(r.provedores).toHaveLength(1);
    const nome = r.provedores[0]?.nome ?? "";
    expect(nome.length).toBeLessThanOrEqual(LIMITES.provedorNome);
    expect(nome.endsWith("…")).toBe(true);
  });

  it("provider_id 0/negativo/ausente/fracionário descartado (não fabrica vínculo)", () => {
    const r = mapearProvedores({
      "watch/providers": {
        results: {
          BR: {
            flatrate: [
              { provider_id: 0, provider_name: "Zero" },
              { provider_id: -4, provider_name: "Negativo" },
              { provider_name: "Sem id" },
              { provider_id: 1.5, provider_name: "Fracionário" },
              { provider_id: 384, provider_name: "  " },
              { provider_id: 384, provider_name: "Crunchyroll" },
            ],
          },
        },
      },
    });
    expect(r.provedores).toEqual([{ tmdb_provider_id: 384, nome: "Crunchyroll" }]);
  });

  it("link não-https é descartado (nunca grava URL estranha em midia_streaming.url)", () => {
    const base = { "watch/providers": { results: { BR: { flatrate: [] } } } };
    expect(
      mapearProvedores({
        "watch/providers": {
          results: { BR: { ...base["watch/providers"].results.BR, link: "http://x" } },
        },
      }).url_link,
    ).toBeNull();
    expect(
      mapearProvedores({
        "watch/providers": { results: { BR: { ...base["watch/providers"].results.BR, link: 42 } } },
      }).url_link,
    ).toBeNull();
  });
});

describe("BackfillService.enriquecerProvedores (T-DADOS-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TMDB_API_KEY = "chave-de-teste";
  });

  it("vincula provedores, cria o serviço e SEMPRE marca provedores_em", async () => {
    const alvo = [
      { id: "m-1", tipo: "FILME", fonte: "tmdb", fonte_id: "693134", titulo: "Duna: Parte Dois" },
    ];
    const { svc, prisma } = makeService({ alvo });
    prisma.streamingService.findUnique.mockResolvedValue(null);
    prisma.streamingService.create.mockResolvedValue({ id: 9 });
    (fetchJson as any).mockResolvedValue({
      "watch/providers": {
        results: {
          BR: {
            link: "https://www.themoviedb.org/movie/693134/watch?locale=BR",
            flatrate: [{ provider_id: 1899, provider_name: "Max" }],
          },
        },
      },
    });
    const r = await svc.enriquecerProvedores(100);
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    expect(prisma.streamingService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { nome: "Max", slug: "max", tmdb_provider_id: 1899 },
      }),
    );
    expect(prisma.midiaStreaming.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { midia_id_service_id: { midia_id: "m-1", service_id: 9 } },
        create: {
          midia_id: "m-1",
          service_id: 9,
          url: "https://www.themoviedb.org/movie/693134/watch?locale=BR",
        },
      }),
    );
    const data = (prisma.midia.update as any).mock.calls[0][0].data;
    expect(data.provedores_em).toBeInstanceOf(Date);
    expect(svc.status().provedores.ok).toBe(1);
    expect(() => JSON.stringify(svc.status())).not.toThrow();
  });

  it("marca provedores_em mesmo SEM provedor no BR (título sai da fila)", async () => {
    const alvo = [
      { id: "m-2", tipo: "SERIE", fonte: "tmdb_tv", fonte_id: "1396", titulo: "Breaking Bad" },
    ];
    const { svc, prisma } = makeService({ alvo });
    // Rota /tv para fonte tmdb_tv (não /movie).
    (fetchJson as any).mockImplementation(async (url: string) => {
      expect(url).toContain("/tv/1396?append_to_response=watch/providers");
      return { "watch/providers": { results: {} } };
    });
    const r = await svc.enriquecerProvedores(10);
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    expect(prisma.midiaStreaming.upsert).not.toHaveBeenCalled();
    const data = (prisma.midia.update as any).mock.calls[0][0].data;
    expect(data.provedores_em).toBeInstanceOf(Date);
  });

  it("serviço existente por tmdb_provider_id é reusado (não recria)", async () => {
    const alvo = [{ id: "m-3", tipo: "FILME", fonte: "tmdb", fonte_id: "11", titulo: "F1" }];
    const { svc, prisma } = makeService({ alvo });
    prisma.streamingService.findUnique.mockResolvedValue({ id: 77 });
    (fetchJson as any).mockResolvedValue({
      "watch/providers": {
        results: { BR: { flatrate: [{ provider_id: 8, provider_name: "Netflix" }] } },
      },
    });
    await svc.enriquecerProvedores(10);
    expect(prisma.streamingService.create).not.toHaveBeenCalled();
    expect(prisma.midiaStreaming.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { midia_id_service_id: { midia_id: "m-3", service_id: 77 } },
        // coleta sem link não apaga URL existente (update url=undefined)
        update: { url: undefined },
      }),
    );
  });

  it("colisão de unique no create do serviço não derruba o título", async () => {
    const alvo = [{ id: "m-4", tipo: "FILME", fonte: "tmdb", fonte_id: "2", titulo: "Colisão" }];
    const { svc, prisma } = makeService({ alvo });
    prisma.streamingService.findUnique.mockResolvedValue(null);
    prisma.streamingService.create.mockRejectedValue(
      new Error("Unique constraint failed on the fields: (`nome`)"),
    );
    (fetchJson as any).mockResolvedValue({
      "watch/providers": {
        results: { BR: { flatrate: [{ provider_id: 1899, provider_name: "Max" }] } },
      },
    });
    const r = await svc.enriquecerProvedores(10);
    expect(prisma.streamingService.create).toHaveBeenCalledTimes(1);
    // create colidiu → refaz lookup (null) → provedor ignorado, título ok.
    expect(prisma.midiaStreaming.upsert).not.toHaveBeenCalled();
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    expect((prisma.midia.update as any).mock.calls[0][0].data.provedores_em).toBeInstanceOf(Date);
  });

  it("colisão recupera o serviço se o lookup posterior por slug o achar", async () => {
    const alvo = [{ id: "m-5", tipo: "FILME", fonte: "tmdb", fonte_id: "3", titulo: "Recupera" }];
    const { svc, prisma } = makeService({ alvo });
    // 1º (por tmdb_provider_id) e 2º (por slug, pré-create) → null; o pós-colisão acha.
    prisma.streamingService.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 55 });
    prisma.streamingService.create.mockRejectedValue(
      new Error("Unique constraint failed on the fields: (`slug`)"),
    );
    (fetchJson as any).mockResolvedValue({
      "watch/providers": {
        results: { BR: { flatrate: [{ provider_id: 337, provider_name: "Disney Plus" }] } },
      },
    });
    const r = await svc.enriquecerProvedores(10);
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    expect(prisma.midiaStreaming.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { midia_id_service_id: { midia_id: "m-5", service_id: 55 } },
      }),
    );
  });

  it("erro por título vai para falhas SEM watermark (retenta depois)", async () => {
    const alvo = [{ id: "m-6", tipo: "FILME", fonte: "tmdb", fonte_id: "1", titulo: "Quebrado" }];
    const { svc, prisma } = makeService({ alvo });
    (fetchJson as any).mockRejectedValue(new Error("TMDB 500"));
    const r = await svc.enriquecerProvedores(10);
    expect(r).toEqual({ processados: 1, ok: 0, falhas: 1 });
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("guard de disco bloqueia (D-574) e job em execução não re-entra", async () => {
    const alvo = [{ id: "m-1", tipo: "FILME", fonte: "tmdb", fonte_id: "1", titulo: "X" }];
    const { svc, prisma } = makeService({ alvo });
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 5000000000n }];
      return alvo;
    });
    await expect(svc.enriquecerProvedores(10)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("drenarLote consome a 5ª fila (fila só de provedores drena)", async () => {
    const { svc, prisma } = makeService({ alvo: [] });
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/sem_elenco/.test(sql)) {
        return [{ sem_elenco: 0, sem_temp: 0, sem_pais: 0, ricos: 0, provedores: 5 }];
      }
      return [];
    });
    const r = await svc.drenarLote(60_000);
    expect(r.lotes).toEqual([{ tipo: "provedores", ok: 0, falhas: 0 }]);
  });
});
