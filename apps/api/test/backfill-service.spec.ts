/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
  mapearCriticaIgdb,
  generosDoPayload,
  MAPA_GENEROS_IGDB,
  mapearLocalizacao,
  classificacaoDeCertificado,
  resetTokenTwitchIgdb,
  // T-DADOS-10: crítica via OMDb (lookup exato por id IMDb + teto diário).
  orcamentoOmdbRestante,
  imdbIdDoPayload,
  ORCAMENTO_OMDB_DIARIO,
} from "../src/modules/admin/backfill.service.js";

/**
 * T178 (D-576) — backfills em processo: mappers portados dos scripts T164/T165
 * e fluxo do serviço (guard de disco, estado por job, upserts idempotentes,
 * alvo filtrado por lacuna).
 */

vi.mock("../src/modules/media-score/adapters/http.utils.js", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, fetchJson: vi.fn(), postJson: vi.fn() };
});

import { ErroColeta, fetchJson, postJson } from "../src/modules/media-score/adapters/http.utils.js";

// URLs EXATAS do job (comparação por igualdade — nada de substring de host no
// teste: o padrão `includes("host")` é alerta js/incomplete-url-substring do CodeQL).
const URL_IGDB_GAMES = "https://api.igdb.com/v4/games";
const URL_TOKEN_TWITCH = "https://id.twitch.tv/oauth2/token";
import { estatisticas } from "../src/modules/media-score/adapters/fonte-adapter.interface.js";

function makeService(over: any = {}) {
  const prisma = {
    $queryRawUnsafe: vi.fn(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      // T-DADOS-10: cota diária do OMDb (títulos distintos já consultados hoje).
      if (/COUNT\(DISTINCT a\.midia_id\)/i.test(sql)) return [{ usados: over.usados ?? 0 }];
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
    // T-DADOS-03: crítica do IGDB em avaliacao_fonte (chave { midia_id, fonte }).
    avaliacaoFonte: { upsert: vi.fn(async ({ create }: any) => create) },
    // T-DADOS-08: certificado regional BR/US (upsert por { midia_id, regiao }).
    classificacaoRegiao: { upsert: vi.fn(async ({ create }: any) => create) },
    relacaoObra: { findFirst: vi.fn(async () => null), create: vi.fn() },
  };
  const mediaScore = { recalcularEPersistir: vi.fn(async () => ({ score: 82 })) };
  // T-DADOS-07: adapter real do ColetaService (mockado — nenhuma rede).
  const openlibrary = {
    id: "openlibrary",
    ativo: vi.fn(() => true),
    coletar: vi.fn(async () => [] as any[]),
  };
  // T-DADOS-10: adapter real do ColetaService (mockado — nenhuma rede).
  const omdb = {
    id: "omdb",
    ativo: vi.fn(() => true),
    coletar: vi.fn(async () => [] as any[]),
  };
  const coleta = { adaptadores: [openlibrary, omdb] };
  const svc = new BackfillService(prisma as any, mediaScore as any, coleta as any);
  return { svc, prisma, mediaScore, coleta, openlibrary, omdb };
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

describe("contarPendentes inclui as filas metadadosRicos/provedores/criticaIgdb/generosGames/arestasFranquia/avaliacaoLivros/localizacao/criticaOmdb (T-DADOS-01/02/03/06/07/08/09/10)", () => {
  it("conta as 11 filas na mesma query", async () => {
    const { svc, prisma } = makeService();
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      // T-DADOS-10: consulta separada da cota diária do OMDb.
      if (/COUNT\(DISTINCT a\.midia_id\)/i.test(sql)) return [{ usados: 0 }];
      expect(sql).toContain("metadados_ricos_em IS NULL");
      expect(sql).toContain("provedores_em IS NULL");
      expect(sql).toContain("critica_igdb_em IS NULL");
      // T-DADOS-09: fila dos games sem gêneros do IGDB.
      expect(sql).toContain("generos_igdb_em IS NULL");
      // T-DADOS-07: fila dos livros sem avaliação coletada.
      expect(sql).toContain("avaliacoes_atualizadas_em IS NULL");
      // T-DADOS-08: fila da localização (en/es + classificação) do TMDB.
      expect(sql).toContain("localizacao_em IS NULL");
      // T-DADOS-10: fila da crítica via OMDb (watermark por id IMDb).
      expect(sql).toContain("critica_omdb_em IS NULL");
      // T-DADOS-06: a fila de arestas é a MESMA condição de "franquia
      // incompleta" do alvo do job (membros com ano >= 2 e faltando aresta).
      expect(sql).toContain("franquia_membros");
      expect(sql).toContain("fm.com_ano >= 2");
      return [
        {
          sem_elenco: 3,
          sem_temp: 2,
          sem_pais: 1,
          ricos: 17217,
          provedores: 17230,
          critica_igdb: 4946,
          generos_games: 4995,
          arestas_franquia: 260,
          avaliacao_livros: 600,
          localizacao: 10570,
          critica_omdb: 10998,
        },
      ];
    });
    await expect(svc.contarPendentes()).resolves.toEqual({
      semElenco: 3,
      seriesSemTemporada: 2,
      filmesSemPais: 1,
      metadadosRicos: 17217,
      provedores: 17230,
      criticaIgdb: 4946,
      generosGames: 4995,
      arestasFranquia: 260,
      avaliacaoLivros: 600,
      localizacao: 10570,
      criticaOmdb: 10998,
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
      criticaIgdb: 0,
      generosGames: 0,
      arestasFranquia: 0,
      avaliacaoLivros: 0,
      localizacao: 0,
      criticaOmdb: 0,
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
        return [
          { sem_elenco: 0, sem_temp: 0, sem_pais: 0, ricos: 0, provedores: 5, critica_igdb: 0 },
        ];
      }
      return [];
    });
    const r = await svc.drenarLote(60_000);
    expect(r.lotes).toEqual([{ tipo: "provedores", ok: 0, falhas: 0 }]);
  });
});

// ===========================================================================
// T-DADOS-03 (D3) — crítica de games no IGDB por id (score_critica)
// ===========================================================================

describe("mapearCriticaIgdb (T-DADOS-03)", () => {
  it("extrai aggregated_rating/aggregated_rating_count/slug do jogo", () => {
    expect(
      mapearCriticaIgdb({
        name: "The Legend of Zelda: Breath of the Wild",
        slug: "the-legend-of-zelda-breath-of-the-wild",
        aggregated_rating: 97.6,
        aggregated_rating_count: 42,
        rating: 95.2,
      }),
    ).toEqual({
      rating: 97.6,
      votos: 42,
      url: "https://www.igdb.com/games/the-legend-of-zelda-breath-of-the-wild",
    });
    // aceita também o array cru do IGDB (usa o primeiro item)
    expect(mapearCriticaIgdb([{ aggregated_rating: 91.5, slug: "x" }])).toEqual({
      rating: 91.5,
      votos: null,
      url: "https://www.igdb.com/games/x",
    });
  });

  it("null/0/negativo/não-numérico/ausente → null (não fabrica crítica)", () => {
    expect(mapearCriticaIgdb({ aggregated_rating: null })).toBeNull();
    expect(mapearCriticaIgdb({ aggregated_rating: 0 })).toBeNull();
    expect(mapearCriticaIgdb({ aggregated_rating: -3 })).toBeNull();
    expect(mapearCriticaIgdb({ aggregated_rating: "sem nota" })).toBeNull();
    expect(mapearCriticaIgdb({})).toBeNull();
    expect(mapearCriticaIgdb(null)).toBeNull();
    expect(mapearCriticaIgdb(undefined)).toBeNull();
    expect(mapearCriticaIgdb([])).toBeNull();
  });

  it("votos inválidos não invalidam a crítica; sem slug → url null", () => {
    expect(mapearCriticaIgdb({ aggregated_rating: 88, aggregated_rating_count: 0 })).toEqual({
      rating: 88,
      votos: null,
      url: null,
    });
    expect(mapearCriticaIgdb({ aggregated_rating: 88, aggregated_rating_count: 12.5 })).toEqual({
      rating: 88,
      votos: null,
      url: null,
    });
    expect(mapearCriticaIgdb({ aggregated_rating: 88, aggregated_rating_count: -1 })).toEqual({
      rating: 88,
      votos: null,
      url: null,
    });
    expect(mapearCriticaIgdb({ aggregated_rating: 88, slug: "   " })).toEqual({
      rating: 88,
      votos: null,
      url: null,
    });
  });
});

describe("BackfillService.enriquecerCriticaIgdb (T-DADOS-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTokenTwitchIgdb();
    process.env.TWITCH_CLIENT_ID = "client-id-de-teste";
    process.env.TWITCH_CLIENT_SECRET = "segredo-de-teste";
  });

  /** postJson: token do Twitch + resposta do IGDB (nunca toca a rede). */
  function mockIgdb(respostas: any[]) {
    let indice = 0;
    (postJson as any).mockImplementation(async (url: string) => {
      if (url === URL_TOKEN_TWITCH) return { access_token: "tok", expires_in: 3600 };
      const r = respostas[Math.min(indice, respostas.length - 1)];
      indice++;
      if (r instanceof Error) throw r;
      return r;
    });
    return () => indice;
  }

  it("grava avaliacao_fonte (fonte igdb) por id exato, recalcula o score do MESMO título e marca o watermark", async () => {
    const alvo = [{ id: "m-1", fonte_id: "7346", titulo: "Breath of the Wild" }];
    const { svc, prisma, mediaScore } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    mockIgdb([
      [
        {
          name: "The Legend of Zelda: Breath of the Wild",
          slug: "the-legend-of-zelda-breath-of-the-wild",
          aggregated_rating: 97.6,
          aggregated_rating_count: 42,
        },
      ],
    ]);
    const r = await svc.enriquecerCriticaIgdb(100);
    expect(r).toEqual({ processados: 1, ok: 1, semCritica: 0, falhas: 0 });
    const chamadaIgdb = (postJson as any).mock.calls.find((c: any[]) => c[0] === URL_IGDB_GAMES);
    // lookup EXATO por id (a busca textual do adapter devolve DLC/porta — fora
    // do escopo desta fatia, mas o job novo não repete o defeito).
    expect(chamadaIgdb[1]).toBe(
      "fields name, slug, aggregated_rating, aggregated_rating_count; where id = 7346; limit 1;",
    );
    expect(chamadaIgdb[1]).not.toContain("search");
    expect(chamadaIgdb[2].headers).toMatchObject({
      "client-id": "client-id-de-teste",
      "authorization": "Bearer tok",
      "accept": "application/json",
      "content-type": "text/plain",
    });
    const stats = estatisticas("0-100");
    expect(prisma.avaliacaoFonte.upsert).toHaveBeenCalledWith({
      where: { midia_id_fonte: { midia_id: "m-1", fonte: "igdb" } },
      create: {
        midia_id: "m-1",
        fonte: "igdb",
        rating: 97.6,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: 42,
        url: "https://www.igdb.com/games/the-legend-of-zelda-breath-of-the-wild",
      },
      update: {
        rating: 97.6,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: 42,
        url: "https://www.igdb.com/games/the-legend-of-zelda-breath-of-the-wild",
      },
    });
    expect(mediaScore.recalcularEPersistir).toHaveBeenCalledWith("m-1");
    const data = (prisma.midia.update as any).mock.calls[0][0].data;
    expect(data.critica_igdb_em).toBeInstanceOf(Date);
    expect(svc.status().criticaIgdb.ok).toBe(1);
    expect(() => JSON.stringify(svc.status())).not.toThrow();
  });

  it("sem aggregated_rating: marca critica_igdb_em, não grava avaliação e não recalcula (fila drena)", async () => {
    const alvo = [{ id: "m-2", fonte_id: "999", titulo: "Jogo sem nota de imprensa" }];
    const { svc, prisma, mediaScore } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    mockIgdb([[{ name: "Sem nota", slug: "sem-nota" }]]);
    const r = await svc.enriquecerCriticaIgdb(10);
    expect(r).toEqual({ processados: 1, ok: 0, semCritica: 1, falhas: 0 });
    expect(prisma.avaliacaoFonte.upsert).not.toHaveBeenCalled();
    expect(mediaScore.recalcularEPersistir).not.toHaveBeenCalled();
    expect((prisma.midia.update as any).mock.calls[0][0].data.critica_igdb_em).toBeInstanceOf(Date);
  });

  it("fonte_id não-inteiro não é consultável: sem dado e SEM travar a fila", async () => {
    const alvo = [{ id: "m-3", fonte_id: "steam-42", titulo: "Id estranho" }];
    const { svc, prisma } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    mockIgdb([[]]);
    const r = await svc.enriquecerCriticaIgdb(10);
    expect(r).toEqual({ processados: 1, ok: 0, semCritica: 1, falhas: 0 });
    expect((postJson as any).mock.calls.filter((c: any[]) => c[0] === URL_IGDB_GAMES)).toHaveLength(
      0,
    );
    expect((prisma.midia.update as any).mock.calls[0][0].data.critica_igdb_em).toBeInstanceOf(Date);
  });

  it("HTTP 429: espera e repete UMA vez (>=300ms de throttle antes de cada chamada)", async () => {
    const alvo = [{ id: "m-4", fonte_id: "74", titulo: "Mass Effect 2" }];
    const { svc, prisma, mediaScore } = makeService({ alvo });
    const pausa = vi.fn(async () => undefined);
    (svc as any).pausa = pausa;
    mockIgdb([
      new ErroColeta("HTTP 429 em https://api.igdb.com/v4/games", 429),
      [{ slug: "mass-effect-2", aggregated_rating: 95.6, aggregated_rating_count: 30 }],
    ]);
    const r = await svc.enriquecerCriticaIgdb(10);
    expect(r).toEqual({ processados: 1, ok: 1, semCritica: 0, falhas: 0 });
    const chamadasIgdb = (postJson as any).mock.calls.filter((c: any[]) => c[0] === URL_IGDB_GAMES);
    expect(chamadasIgdb).toHaveLength(2);
    // throttle (>=300ms) antes de cada tentativa + espera do 429 (1,5s)
    expect(pausa.mock.calls.filter((c: any[]) => c[0] >= 300).length).toBeGreaterThanOrEqual(2);
    expect(pausa).toHaveBeenCalledWith(1500);
    expect(mediaScore.recalcularEPersistir).toHaveBeenCalledWith("m-4");
    expect((prisma.midia.update as any).mock.calls[0][0].data.critica_igdb_em).toBeInstanceOf(Date);
  });

  it("429 persistente: falha o título e NÃO marca o watermark (retenta na próxima rodada)", async () => {
    const alvo = [{ id: "m-5", fonte_id: "1070", titulo: "Super Mario World" }];
    const { svc, prisma, mediaScore } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    mockIgdb([new ErroColeta("HTTP 429 em https://api.igdb.com/v4/games", 429)]);
    const r = await svc.enriquecerCriticaIgdb(10);
    expect(r).toEqual({ processados: 1, ok: 0, semCritica: 0, falhas: 1 });
    // 1 tentativa + 1 retentativa; nada além disso.
    expect((postJson as any).mock.calls.filter((c: any[]) => c[0] === URL_IGDB_GAMES)).toHaveLength(
      2,
    );
    expect(prisma.avaliacaoFonte.upsert).not.toHaveBeenCalled();
    expect(mediaScore.recalcularEPersistir).not.toHaveBeenCalled();
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("erro não-429 (falha de rede) também não marca o watermark", async () => {
    const alvo = [{ id: "m-6", fonte_id: "1", titulo: "Rede caída" }];
    const { svc, prisma } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    mockIgdb([new Error("fetch failed")]);
    const r = await svc.enriquecerCriticaIgdb(10);
    expect(r).toEqual({ processados: 1, ok: 0, semCritica: 0, falhas: 1 });
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("sem credenciais Twitch → BadRequestException; guard de disco bloqueia (D-574)", async () => {
    const alvo = [{ id: "m-7", fonte_id: "1", titulo: "X" }];
    const { svc, prisma } = makeService({ alvo });
    delete process.env.TWITCH_CLIENT_ID;
    await expect(svc.enriquecerCriticaIgdb(10)).rejects.toBeInstanceOf(BadRequestException);
    process.env.TWITCH_CLIENT_ID = "client-id-de-teste";
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 5000000000n }];
      return alvo;
    });
    await expect(svc.enriquecerCriticaIgdb(10)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("drenarLote consome a 6ª fila (fila só de crítica IGDB drena)", async () => {
    const { svc, prisma } = makeService({ alvo: [] });
    (svc as any).pausa = vi.fn(async () => undefined);
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/sem_elenco/.test(sql)) {
        return [
          { sem_elenco: 0, sem_temp: 0, sem_pais: 0, ricos: 0, provedores: 0, critica_igdb: 3 },
        ];
      }
      return [];
    });
    const r = await svc.drenarLote(60_000);
    expect(r.lotes).toEqual([{ tipo: "criticaIgdb", ok: 0, falhas: 0 }]);
  });
});

// ===========================================================================
// T-DADOS-06 (D6) — arestas SEQUENCIA_DE nas franquias incompletas
// ===========================================================================

describe("BackfillService.enriquecerArestasFranquia (T-DADOS-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * `$queryRawUnsafe` do job: guarda de disco, o alvo (CTE `franquia_membros`,
   * sem `sem_elenco`) e a busca de membros por franquia (`$1::uuid`). Devolve
   * também o SQL do alvo capturado (prova da condição de "franquia incompleta").
   */
  function setup(franquias: string[], membrosPorFranquia: Record<string, any[]>) {
    const { svc, prisma } = makeService();
    const sqls: string[] = [];
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      sqls.push(sql);
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/mf\.franquia_id = \$1/.test(sql)) {
        // membros da franquia do argumento (o mock ignora params; 1 franquia por caso)
        return membrosPorFranquia[franquias[0] ?? ""] ?? [];
      }
      if (/franquia_membros/.test(sql)) return franquias.map((id) => ({ franquia_id: id }));
      return [];
    });
    const sqlAlvo = () =>
      sqls.find((s) => /franquia_membros/.test(s) && !/sem_elenco/.test(s)) ?? "";
    return { svc, prisma, sqlAlvo };
  }

  it("franquia com 3 membros e 0 arestas → cria 2 na ordem de ano (origem = mais antigo)", async () => {
    const { svc, prisma } = setup(["f1"], {
      f1: [
        { id: "c", ano_lancamento: 2003, titulo: "Parte 3" },
        { id: "a", ano_lancamento: 2001, titulo: "Parte 1" },
        { id: "b", ano_lancamento: 2002, titulo: "Parte 2" },
      ],
    });
    prisma.relacaoObra.findFirst.mockResolvedValue(null);
    prisma.relacaoObra.create.mockResolvedValue({});
    const r = await svc.enriquecerArestasFranquia(2000);
    expect(r).toEqual({ processados: 1, ok: 1, arestasCriadas: 2, jaExistiam: 0, falhas: 0 });
    const criadas = (prisma.relacaoObra.create as any).mock.calls.map((c: any[]) => c[0].data);
    expect(criadas).toEqual([
      {
        origem_id: "a",
        destino_id: "b",
        tipo: "SEQUENCIA_DE",
        nota_editorial: "Sequência direta na coleção",
      },
      {
        origem_id: "b",
        destino_id: "c",
        tipo: "SEQUENCIA_DE",
        nota_editorial: "Sequência direta na coleção",
      },
    ]);
    expect(svc.status().arestasFranquia.ok).toBe(1);
    expect(svc.status().arestasFranquia.executando).toBe(false);
    expect(() => JSON.stringify(svc.status())).not.toThrow();
  });

  it("o ALVO exclui franquia completa: SQL condiciona a incompleta (< com_ano - 1); nada é criado", async () => {
    // O banco filtra a franquia JÁ COMPLETA (arestas >= membros-1) e as de <2
    // membros com ano — o job recebe lista vazia e não cria nada.
    const { svc, prisma, sqlAlvo } = setup([], {});
    const r = await svc.enriquecerArestasFranquia(2000);
    expect(r).toEqual({ processados: 0, ok: 0, arestasCriadas: 0, jaExistiam: 0, falhas: 0 });
    expect(prisma.relacaoObra.create).not.toHaveBeenCalled();
    const sql = sqlAlvo();
    // condição honesta: >=2 membros com ano E faltando pelo menos uma aresta
    expect(sql).toContain("fm.com_ano >= 2");
    expect(sql).toContain("COALESCE(fa.existentes, 0) < fm.com_ano - 1");
    expect(sql).toContain("LIMIT 2000");
  });

  it("membro sem ano_lancamento é ignorado; franquia com só 1 membro com ano não gera aresta", async () => {
    const { svc, prisma } = setup(["f1"], {
      f1: [
        { id: "a", ano_lancamento: 2001, titulo: "Parte 1" },
        { id: "b", ano_lancamento: null, titulo: "Sem data" },
      ],
    });
    const r = await svc.enriquecerArestasFranquia(2000);
    // 1 membro com ano → 0 arestas (o alvo nunca deveria trazer; se trouxer, é no-op)
    expect(r).toEqual({ processados: 1, ok: 1, arestasCriadas: 0, jaExistiam: 0, falhas: 0 });
    expect(prisma.relacaoObra.create).not.toHaveBeenCalled();
  });

  it("aresta que já existe NÃO é recriada (conta como jaExistiam)", async () => {
    const { svc, prisma } = setup(["f1"], {
      f1: [
        { id: "a", ano_lancamento: 2001, titulo: "Parte 1" },
        { id: "b", ano_lancamento: 2002, titulo: "Parte 2" },
      ],
    });
    prisma.relacaoObra.findFirst.mockResolvedValue({ id: "r1" });
    const r = await svc.enriquecerArestasFranquia(10);
    expect(r).toEqual({ processados: 1, ok: 1, arestasCriadas: 0, jaExistiam: 1, falhas: 0 });
    expect(prisma.relacaoObra.create).not.toHaveBeenCalled();
  });

  it("corrida: create falha com P2002 → conta jaExistiam, nunca falha", async () => {
    const { svc, prisma } = setup(["f1"], {
      f1: [
        { id: "a", ano_lancamento: 2001, titulo: "Parte 1" },
        { id: "b", ano_lancamento: 2002, titulo: "Parte 2" },
      ],
    });
    prisma.relacaoObra.findFirst.mockResolvedValue(null); // passou pelo findFirst
    prisma.relacaoObra.create.mockRejectedValue(
      Object.assign(new Error("unique"), { code: "P2002" }),
    );
    const r = await svc.enriquecerArestasFranquia(10);
    expect(r).toEqual({ processados: 1, ok: 1, arestasCriadas: 0, jaExistiam: 1, falhas: 0 });
    expect(prisma.relacaoObra.create).toHaveBeenCalledTimes(1);
  });

  it("erro não-P2002 por franquia conta falha e o job nunca lança", async () => {
    const { svc, prisma } = setup(["f1"], {
      f1: [
        { id: "a", ano_lancamento: 2001, titulo: "Parte 1" },
        { id: "b", ano_lancamento: 2002, titulo: "Parte 2" },
      ],
    });
    prisma.relacaoObra.findFirst.mockResolvedValue(null);
    prisma.relacaoObra.create.mockRejectedValue(new Error("banco caiu"));
    const r = await svc.enriquecerArestasFranquia(10);
    expect(r).toEqual({ processados: 1, ok: 0, arestasCriadas: 0, jaExistiam: 0, falhas: 1 });
  });

  it("job em execução não re-entra; guard de disco bloqueia (D-574)", async () => {
    const { svc, prisma } = makeService();
    (svc as any).estado.arestasFranquia.executando = true;
    await expect(svc.enriquecerArestasFranquia(10)).rejects.toBeInstanceOf(BadRequestException);
    (svc as any).estado.arestasFranquia = {
      executando: false,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: null,
      atual: null,
    };
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 5000000000n }];
      return [];
    });
    await expect(svc.enriquecerArestasFranquia(10)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("drenarLote consome a 7ª fila (fila só de arestas de franquia drena)", async () => {
    const { svc, prisma } = makeService({ alvo: [] });
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/sem_elenco/.test(sql)) {
        return [
          {
            sem_elenco: 0,
            sem_temp: 0,
            sem_pais: 0,
            ricos: 0,
            provedores: 0,
            critica_igdb: 0,
            arestas_franquia: 2,
          },
        ];
      }
      return [];
    });
    const r = await svc.drenarLote(60_000);
    expect(r.lotes).toEqual([{ tipo: "arestasFranquia", ok: 0, falhas: 0 }]);
  });
});

// ===========================================================================
// T-DADOS-07 (D7) — avaliações públicas de livros (OpenLibrary por id do work)
// ===========================================================================

describe("BackfillService.enriquecerAvaliacaoLivros (T-DADOS-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Alvo do job (LIVRO openlibrary com a coluna de watermark nula). */
  const alvo = [{ id: "m-livro-1", fonte_id: "OL471932W", titulo: "Duna" }];

  it("chama o adapter REAL com idsExternos.openlibrary preenchido", async () => {
    const { svc, prisma, openlibrary } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    openlibrary.coletar.mockResolvedValue([
      { fonte: "openlibrary", rating: 4.2, media_fonte: 3.5, desvio_fonte: 0.6, votos: 83 },
    ]);
    await svc.enriquecerAvaliacaoLivros(100);
    expect(openlibrary.coletar).toHaveBeenCalledWith({
      tipo: "LIVRO",
      titulo: "Duna",
      idsExternos: { openlibrary: "OL471932W" },
    });
    // throttle da fonte aberta antes da chamada.
    expect((svc as any).pausa).toHaveBeenCalledWith(250);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("m.avaliacoes_atualizadas_em IS NULL"),
    );
  });

  it("sem nota: marca avaliacoes_atualizadas_em e NÃO grava/recalcula (fila drena)", async () => {
    const { svc, prisma, mediaScore, openlibrary } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    openlibrary.coletar.mockResolvedValue([]);
    const r = await svc.enriquecerAvaliacaoLivros(100);
    expect(r).toEqual({ processados: 1, ok: 0, semAvaliacao: 1, falhas: 0 });
    expect(prisma.avaliacaoFonte.upsert).not.toHaveBeenCalled();
    expect(mediaScore.recalcularEPersistir).not.toHaveBeenCalled();
    const data = (prisma.midia.update as any).mock.calls[0][0].data;
    expect(data.avaliacoes_atualizadas_em).toBeInstanceOf(Date);
    expect(svc.status().avaliacaoLivros.executando).toBe(false);
  });

  it("com nota: upsert em avaliacao_fonte e recalcula o score do MESMO título", async () => {
    const { svc, prisma, mediaScore, openlibrary } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    openlibrary.coletar.mockResolvedValue([
      {
        fonte: "openlibrary",
        rating: 4.2289,
        media_fonte: 3.5,
        desvio_fonte: 0.6,
        votos: 83,
        url: "https://openlibrary.org/works/OL471932W",
      },
    ]);
    const r = await svc.enriquecerAvaliacaoLivros(100);
    expect(r).toEqual({ processados: 1, ok: 1, semAvaliacao: 0, falhas: 0 });
    expect(prisma.avaliacaoFonte.upsert).toHaveBeenCalledWith({
      where: { midia_id_fonte: { midia_id: "m-livro-1", fonte: "openlibrary" } },
      create: {
        midia_id: "m-livro-1",
        fonte: "openlibrary",
        rating: 4.2289,
        media_fonte: 3.5,
        desvio_fonte: 0.6,
        votos: 83,
        url: "https://openlibrary.org/works/OL471932W",
      },
      update: {
        rating: 4.2289,
        media_fonte: 3.5,
        desvio_fonte: 0.6,
        votos: 83,
        url: "https://openlibrary.org/works/OL471932W",
      },
    });
    expect(mediaScore.recalcularEPersistir).toHaveBeenCalledWith("m-livro-1");
    expect(
      (prisma.midia.update as any).mock.calls[0][0].data.avaliacoes_atualizadas_em,
    ).toBeInstanceOf(Date);
    expect(() => JSON.stringify(svc.status())).not.toThrow();
  });

  it("adapter inativo/ausente: falha o título e NÃO marca o watermark", async () => {
    const { svc, prisma, openlibrary } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    openlibrary.ativo.mockReturnValue(false);
    const r = await svc.enriquecerAvaliacaoLivros(10);
    expect(r).toEqual({ processados: 1, ok: 0, semAvaliacao: 0, falhas: 1 });
    expect(openlibrary.coletar).not.toHaveBeenCalled();
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("erro de rede: falha o título e NÃO marca o watermark (retenta)", async () => {
    const { svc, prisma, openlibrary } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    openlibrary.coletar.mockRejectedValue(new Error("fetch failed"));
    const r = await svc.enriquecerAvaliacaoLivros(10);
    expect(r).toEqual({ processados: 1, ok: 0, semAvaliacao: 0, falhas: 1 });
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("adapter ativo: fila reflete a contagem real de livros sem coleta", async () => {
    const { svc, prisma } = makeService();
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/sem_elenco/.test(sql)) {
        return [
          {
            sem_elenco: 0,
            sem_temp: 0,
            sem_pais: 0,
            ricos: 0,
            provedores: 0,
            critica_igdb: 0,
            arestas_franquia: 0,
            avaliacao_livros: 600,
          },
        ];
      }
      return [];
    });
    await expect(svc.contarPendentes()).resolves.toMatchObject({ avaliacaoLivros: 600 });
  });

  it("adapter inativo ou ausente: fila 0 e drenarLote NÃO chama o job (dormente, sem ruído)", async () => {
    const { svc, prisma, coleta, openlibrary } = makeService({ alvo: [] });
    openlibrary.ativo.mockReturnValue(false);
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/sem_elenco/.test(sql)) {
        return [
          {
            sem_elenco: 0,
            sem_temp: 0,
            sem_pais: 0,
            ricos: 0,
            provedores: 0,
            critica_igdb: 0,
            arestas_franquia: 0,
            avaliacao_livros: 600,
          },
        ];
      }
      return [];
    });
    await expect(svc.contarPendentes()).resolves.toMatchObject({ avaliacaoLivros: 0 });
    const job = vi.spyOn(svc, "enriquecerAvaliacaoLivros");
    const r = await svc.drenarLote(60_000);
    expect(job).not.toHaveBeenCalled();
    expect(r.lotes).toEqual([]);
    expect(svc.status().avaliacaoLivros.falhas).toBe(0);

    // Adapter removido do ColetaService (fonte indisponível) → mesmo no-op.
    coleta.adaptadores.length = 0;
    await expect(svc.contarPendentes()).resolves.toMatchObject({ avaliacaoLivros: 0 });
  });

  it("drenarLote consome a 8ª fila e conta os sem nota como drenados", async () => {
    const { svc, prisma } = makeService({ alvo: [] });
    (svc as any).pausa = vi.fn(async () => undefined);
    vi.spyOn(svc, "enriquecerAvaliacaoLivros").mockResolvedValue({
      processados: 3,
      ok: 1,
      semAvaliacao: 2,
      falhas: 0,
    });
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/sem_elenco/.test(sql)) {
        return [
          {
            sem_elenco: 0,
            sem_temp: 0,
            sem_pais: 0,
            ricos: 0,
            provedores: 0,
            critica_igdb: 0,
            arestas_franquia: 0,
            avaliacao_livros: 600,
          },
        ];
      }
      return [];
    });
    const r = await svc.drenarLote(60_000);
    expect(r.lotes).toEqual([{ tipo: "avaliacaoLivros", ok: 3, falhas: 0 }]);
    expect(svc.enriquecerAvaliacaoLivros).toHaveBeenCalledWith(800);
  });
});

// ===========================================================================
// T-DADOS-10 — crítica via OMDb (lookup exato por id IMDb + teto diário)
// ===========================================================================

describe("orcamentoOmdbRestante / imdbIdDoPayload (T-DADOS-10)", () => {
  it("teto de 900/dia (margem de 10% sob o limite grátis de 1.000)", () => {
    expect(ORCAMENTO_OMDB_DIARIO).toBe(900);
    expect(orcamentoOmdbRestante(0)).toBe(900);
    expect(orcamentoOmdbRestante(890)).toBe(10);
    expect(orcamentoOmdbRestante(900)).toBe(0);
    expect(orcamentoOmdbRestante(1200)).toBe(0);
    expect(orcamentoOmdbRestante(Number.NaN)).toBe(900);
  });

  it("filme lê imdb_id; série lê external_ids.imdb_id; lixo é rejeitado", () => {
    expect(imdbIdDoPayload({ imdb_id: "tt0274558" }, "FILME")).toBe("tt0274558");
    expect(imdbIdDoPayload({ external_ids: { imdb_id: "tt0903747" } }, "SERIE")).toBe("tt0903747");
    expect(imdbIdDoPayload({ imdb_id: "abc" }, "FILME")).toBeNull();
    expect(imdbIdDoPayload({ imdb_id: "tt12" }, "FILME")).toBeNull();
    expect(imdbIdDoPayload({ external_ids: {} }, "SERIE")).toBeNull();
    expect(imdbIdDoPayload(null, "FILME")).toBeNull();
    // O shape de série não serve para filme (e vice-versa).
    expect(imdbIdDoPayload({ external_ids: { imdb_id: "tt0903747" } }, "FILME")).toBeNull();
    expect(imdbIdDoPayload({ imdb_id: "tt0274558" }, "SERIE")).toBeNull();
  });
});

describe("BackfillService.enriquecerCriticaOmdb (T-DADOS-10)", () => {
  const envOriginal = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TMDB_API_KEY = "tmdb-test";
  });

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  const alvo = [{ id: "m-filme-1", tipo: "FILME", fonte_id: "8467", titulo: "The Hours" }];

  /** Mock de contarPendentes com a fila OMDb e a cota do dia. */
  function mockContagens(prisma: any, opts: { usados: number; pendentes?: number; alvo?: any[] }) {
    prisma.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/COUNT\(DISTINCT a\.midia_id\)/i.test(sql)) return [{ usados: opts.usados }];
      if (/AS critica_omdb/.test(sql)) {
        return [
          {
            sem_elenco: 0,
            sem_temp: 0,
            sem_pais: 0,
            ricos: 0,
            provedores: 0,
            critica_igdb: 0,
            generos_games: 0,
            arestas_franquia: 0,
            avaliacao_livros: 0,
            localizacao: 0,
            critica_omdb: opts.pendentes ?? 10998,
          },
        ];
      }
      return opts.alvo ?? [];
    });
  }

  it("passa idsExternos.omdb ao adapter e busca o TMDB por id com external_ids", async () => {
    const { svc, omdb } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    (svc as any).tmdb = vi.fn(async () => ({ imdb_id: "tt0274558" }));
    omdb.coletar.mockResolvedValue([
      {
        fonte: "omdb",
        rating: 7.5,
        media_fonte: 7,
        desvio_fonte: 1.5,
        votos: 140000,
        url: "https://www.imdb.com/title/tt0274558",
      },
    ]);
    const r = await svc.enriquecerCriticaOmdb(10);
    expect((svc as any).tmdb).toHaveBeenCalledWith(
      "/movie/8467?append_to_response=external_ids",
      "tmdb-test",
    );
    expect(omdb.coletar).toHaveBeenCalledWith({
      tipo: "FILME",
      titulo: "The Hours",
      idsExternos: { omdb: "tt0274558" },
    });
    // throttle OMDb antes da consulta.
    expect((svc as any).pausa).toHaveBeenCalledWith(300);
    expect(r).toMatchObject({
      processados: 1,
      ok: 1,
      semImdb: 0,
      semNota: 0,
      falhas: 0,
      queries: 1,
    });
  });

  it("teto: com 900 consultados hoje a fila zera e o job não processa nada", async () => {
    const { svc, prisma, omdb } = makeService({ alvo, usados: 900 });
    mockContagens(prisma, { usados: 900, alvo });
    await expect(svc.contarPendentes()).resolves.toMatchObject({ criticaOmdb: 0 });
    const r = await svc.enriquecerCriticaOmdb(900);
    expect(r).toEqual({
      processados: 0,
      ok: 0,
      semImdb: 0,
      semNota: 0,
      falhas: 0,
      queries: 0,
    });
    expect(omdb.coletar).not.toHaveBeenCalled();
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("teto: com 890 usados processa no máximo 10 títulos (corte do alvo)", async () => {
    const muitos = Array.from({ length: 15 }, (_, i) => ({
      id: `m-${i}`,
      tipo: "FILME",
      fonte_id: String(i + 1),
      titulo: `Título ${i}`,
    }));
    const { svc, prisma, omdb } = makeService({ alvo: muitos, usados: 890 });
    mockContagens(prisma, { usados: 890, alvo: muitos });
    (svc as any).pausa = vi.fn(async () => undefined);
    (svc as any).tmdb = vi.fn(async () => ({ imdb_id: "tt0274558" }));
    omdb.coletar.mockResolvedValue([]);
    // A fila ainda aparece com 890 usados (restam 10).
    await expect(svc.contarPendentes()).resolves.toMatchObject({ criticaOmdb: 10998 });
    const r = await svc.enriquecerCriticaOmdb(900);
    expect(r.processados).toBe(10);
    expect(r.queries).toBe(10);
    expect(omdb.coletar).toHaveBeenCalledTimes(10);
  });

  it("sem imdb_id: marca o watermark e NÃO consulta o OMDb (não gasta cota)", async () => {
    const { svc, prisma, omdb } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    (svc as any).tmdb = vi.fn(async () => ({}));
    const r = await svc.enriquecerCriticaOmdb(10);
    expect(r).toMatchObject({
      processados: 1,
      ok: 0,
      semImdb: 1,
      semNota: 0,
      falhas: 0,
      queries: 0,
    });
    expect(omdb.coletar).not.toHaveBeenCalled();
    expect(prisma.midia.update).toHaveBeenCalledWith({
      where: { id: "m-filme-1" },
      data: { critica_omdb_em: expect.any(Date) },
    });
  });

  it("com nota: upsert por fonte (omdb/RT/MC) e recalcula o score do MESMO título", async () => {
    const { svc, prisma, mediaScore, omdb } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    (svc as any).tmdb = vi.fn(async () => ({ imdb_id: "tt0274558" }));
    const url = "https://www.imdb.com/title/tt0274558";
    omdb.coletar.mockResolvedValue([
      { fonte: "omdb", rating: 7.5, media_fonte: 7, desvio_fonte: 1.5, votos: 140000, url },
      { fonte: "rottentomatoes", rating: 79, media_fonte: 70, desvio_fonte: 15, url },
      { fonte: "metacritic", rating: 80, media_fonte: 70, desvio_fonte: 15, url },
    ]);
    const r = await svc.enriquecerCriticaOmdb(10);
    expect(r).toMatchObject({ processados: 1, ok: 1, falhas: 0, queries: 1 });
    expect(prisma.avaliacaoFonte.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.avaliacaoFonte.upsert).toHaveBeenCalledWith({
      where: { midia_id_fonte: { midia_id: "m-filme-1", fonte: "metacritic" } },
      create: {
        midia_id: "m-filme-1",
        fonte: "metacritic",
        rating: 80,
        media_fonte: 70,
        desvio_fonte: 15,
        votos: undefined,
        url,
      },
      update: {
        rating: 80,
        media_fonte: 70,
        desvio_fonte: 15,
        votos: undefined,
        url,
      },
    });
    expect(mediaScore.recalcularEPersistir).toHaveBeenCalledWith("m-filme-1");
    expect(prisma.midia.update).toHaveBeenCalledWith({
      where: { id: "m-filme-1" },
      data: { critica_omdb_em: expect.any(Date) },
    });
  });

  it("URL vazia no update preserva a anterior (undefined omite a coluna)", async () => {
    const { svc, prisma, omdb } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    (svc as any).tmdb = vi.fn(async () => ({ imdb_id: "tt0274558" }));
    omdb.coletar.mockResolvedValue([
      { fonte: "omdb", rating: 7.5, media_fonte: 7, desvio_fonte: 1.5, url: "" },
    ]);
    await svc.enriquecerCriticaOmdb(10);
    const chamada = (prisma.avaliacaoFonte.upsert as any).mock.calls[0][0];
    expect(chamada.update.url).toBeUndefined();
    expect(chamada.create.url).toBeUndefined();
  });

  it("erro de rede/429: falha o título e NÃO marca o watermark (retenta amanhã)", async () => {
    const { svc, prisma, omdb } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    (svc as any).tmdb = vi.fn(async () => ({ imdb_id: "tt0274558" }));
    omdb.coletar.mockRejectedValue(new Error("HTTP 429"));
    const r = await svc.enriquecerCriticaOmdb(10);
    expect(r).toEqual({
      processados: 1,
      ok: 0,
      semImdb: 0,
      semNota: 0,
      falhas: 1,
      queries: 1,
    });
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("fonte inativa/ausente: fila 0 e drenarLote NÃO chama o job (dormente)", async () => {
    const { svc, prisma, omdb } = makeService({ alvo: [] });
    omdb.ativo.mockReturnValue(false);
    mockContagens(prisma, { usados: 0, pendentes: 10998, alvo: [] });
    await expect(svc.contarPendentes()).resolves.toMatchObject({ criticaOmdb: 0 });
    const job = vi.spyOn(svc, "enriquecerCriticaOmdb");
    const r = await svc.drenarLote(60_000);
    expect(job).not.toHaveBeenCalled();
    expect(r.lotes).toEqual([]);
  });

  it("drenarLote consome a fila crítica OMDb e soma sem_imdb/sem_nota ao ok", async () => {
    const { svc, prisma } = makeService({ alvo: [] });
    vi.spyOn(svc, "enriquecerCriticaOmdb").mockResolvedValue({
      processados: 4,
      ok: 1,
      semImdb: 2,
      semNota: 1,
      falhas: 0,
      queries: 1,
    });
    mockContagens(prisma, { usados: 0, pendentes: 10, alvo: [] });
    const r = await svc.drenarLote(60_000);
    expect(r.lotes).toEqual([{ tipo: "criticaOmdb", ok: 4, falhas: 0 }]);
    expect(svc.enriquecerCriticaOmdb).toHaveBeenCalledWith(900);
  });
});

// ===========================================================================
// T-DADOS-08 (D8) — localização en/es + classificação indicativa/regional
// ===========================================================================

describe("mapearLocalizacao (T-DADOS-08)", () => {
  it("filme: overviews/títulos en/es (data.title) e certificados de release_dates", () => {
    const r = mapearLocalizacao(
      {
        translations: {
          translations: [
            { iso_639_1: "en", data: { overview: "  An English overview  ", title: "Title EN" } },
            { iso_639_1: "es", data: { overview: "Sinopsis ES", title: "Título ES" } },
          ],
        },
        release_dates: {
          results: [
            { iso_3166_1: "BR", release_dates: [{ certification: "" }, { certification: "14" }] },
            { iso_3166_1: "US", release_dates: [{ certification: "PG-13" }] },
          ],
        },
      },
      "FILME",
    );
    expect(r).toEqual({
      sinopse_en: "An English overview",
      sinopse_es: "Sinopsis ES",
      titulo_en: "Title EN",
      titulo_es: "Título ES",
      cert_br: "14",
      cert_us: "PG-13",
    });
  });

  it("série: usa data.name e certificados de content_ratings", () => {
    const r = mapearLocalizacao(
      {
        translations: {
          translations: [
            { iso_639_1: "en", data: { overview: "EN", name: "Show EN", title: "não usar" } },
            { iso_639_1: "es", data: { overview: "ES", name: "Show ES" } },
          ],
        },
        content_ratings: {
          results: [
            { iso_3166_1: "BR", rating: "16" },
            { iso_3166_1: "US", rating: "TV-MA" },
          ],
        },
      },
      "SERIE",
    );
    expect(r.titulo_en).toBe("Show EN");
    expect(r.titulo_es).toBe("Show ES");
    expect(r.cert_br).toBe("16");
    expect(r.cert_us).toBe("TV-MA");
  });

  it("payload sem translations/países → nulls, sem lançar", () => {
    const vazio = {
      sinopse_en: null,
      sinopse_es: null,
      titulo_en: null,
      titulo_es: null,
      cert_br: null,
      cert_us: null,
    };
    expect(mapearLocalizacao(undefined, "FILME")).toEqual(vazio);
    expect(mapearLocalizacao({}, "SERIE")).toEqual(vazio);
    expect(mapearLocalizacao({ translations: { translations: [] } }, "FILME")).toEqual(vazio);
    expect(
      mapearLocalizacao({ translations: { translations: [{ iso_639_1: "fr" }] } }, "SERIE"),
    ).toEqual(vazio);
  });

  it("overview vazio/whitespace → null (não grava string vazia)", () => {
    const r = mapearLocalizacao(
      {
        translations: {
          translations: [
            { iso_639_1: "en", data: { overview: "   ", title: "  " } },
            { iso_639_1: "es", data: { overview: "" } },
          ],
        },
      },
      "FILME",
    );
    expect(r.sinopse_en).toBeNull();
    expect(r.titulo_en).toBeNull();
    expect(r.sinopse_es).toBeNull();
  });

  it("certificação escolhe a primeira não-vazia do país (movie e tv)", () => {
    const movie = mapearLocalizacao(
      {
        release_dates: {
          results: [
            {
              iso_3166_1: "BR",
              release_dates: [
                { certification: "" },
                { certification: "12" },
                { certification: "16" },
              ],
            },
          ],
        },
      },
      "FILME",
    );
    expect(movie.cert_br).toBe("12");
    const tv = mapearLocalizacao(
      {
        content_ratings: {
          results: [
            { iso_3166_1: "BR", rating: "" },
            { iso_3166_1: "BR", rating: "14" },
          ],
        },
      },
      "SERIE",
    );
    expect(tv.cert_br).toBe("14");
  });
});

describe("classificacaoDeCertificado (T-DADOS-08)", () => {
  it("mapeia L/LIVRE/0/10/12/14/16/18 para o enum", () => {
    expect(classificacaoDeCertificado("L")).toBe("L");
    expect(classificacaoDeCertificado("livre")).toBe("L");
    expect(classificacaoDeCertificado(" 0 ")).toBe("L");
    expect(classificacaoDeCertificado("10")).toBe("DEZ");
    expect(classificacaoDeCertificado("12")).toBe("DOZE");
    expect(classificacaoDeCertificado("14")).toBe("CATORZE");
    expect(classificacaoDeCertificado("16")).toBe("DEZESSEIS");
    expect(classificacaoDeCertificado("18")).toBe("DEZOITO");
  });

  it("prefixo numérico claro é aceito ('12 anos' → DOZE)", () => {
    expect(classificacaoDeCertificado("12 anos")).toBe("DOZE");
    expect(classificacaoDeCertificado("14 ANOS")).toBe("CATORZE");
  });

  it("valor desconhecido → null (nunca adivinha)", () => {
    expect(classificacaoDeCertificado("PG-13")).toBeNull();
    expect(classificacaoDeCertificado("TV-MA")).toBeNull();
    expect(classificacaoDeCertificado("12+")).toBe("DOZE");
    expect(classificacaoDeCertificado("lixo")).toBeNull();
    expect(classificacaoDeCertificado("")).toBeNull();
    expect(classificacaoDeCertificado(null)).toBeNull();
  });
});

describe("BackfillService.enriquecerLocalizacao (T-DADOS-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TMDB_API_KEY = "chave-de-teste";
  });

  function alvo(over: any = {}) {
    return [
      {
        id: "m-1",
        tipo: "FILME",
        fonte_id: "693134",
        titulo: "Duna: Parte Dois",
        sinopse_en: null,
        sinopse_es: null,
        titulo_en: null,
        titulo_es: null,
        classificacao_indicativa: null,
        ...over,
      },
    ];
  }

  it("não sobrescreve sinopse_en já preenchida; grava só o que veio", async () => {
    const { svc, prisma } = makeService({
      alvo: alvo({ sinopse_en: "Sinopse curada" }),
    });
    (svc as any).pausa = vi.fn(async () => undefined);
    (fetchJson as any).mockResolvedValue({
      translations: {
        translations: [
          { iso_639_1: "en", data: { overview: "Nova EN", title: "Novo título" } },
          { iso_639_1: "es", data: { overview: "Nueva ES" } },
        ],
      },
      release_dates: {
        results: [
          { iso_3166_1: "BR", release_dates: [{ certification: "12" }] },
          { iso_3166_1: "US", release_dates: [{ certification: "PG-13" }] },
        ],
      },
    });
    const r = await svc.enriquecerLocalizacao(10);
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    const data = (prisma.midia.update as any).mock.calls[0][0].data;
    // A asserção que prova a não-sobrescrita:
    expect("sinopse_en" in data).toBe(false);
    expect(data.sinopse_es).toBe("Nueva ES");
    expect(data.titulo_en).toBe("Novo título");
    expect(data.classificacao_indicativa).toBe("DOZE");
    expect(data.localizacao_em).toBeInstanceOf(Date);
    expect(prisma.classificacaoRegiao.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { midia_id_regiao: { midia_id: "m-1", regiao: "BR" } },
        create: { midia_id: "m-1", regiao: "BR", valor: "12", fonte: "tmdb" },
        update: { valor: "12", fonte: "tmdb" },
      }),
    );
    expect(svc.status().localizacao.ok).toBe(1);
    expect(() => JSON.stringify(svc.status())).not.toThrow();
  });

  it("watermark gravado mesmo sem tradução (título sai da fila)", async () => {
    const { svc, prisma } = makeService({ alvo: alvo() });
    (svc as any).pausa = vi.fn(async () => undefined);
    (fetchJson as any).mockResolvedValue({});
    const r = await svc.enriquecerLocalizacao(10);
    expect(r).toEqual({ processados: 1, ok: 1, falhas: 0 });
    const data = (prisma.midia.update as any).mock.calls[0][0].data;
    expect(data.localizacao_em).toBeInstanceOf(Date);
    expect("sinopse_en" in data).toBe(false);
    expect("sinopse_es" in data).toBe(false);
    expect(prisma.classificacaoRegiao.upsert).not.toHaveBeenCalled();
  });

  it("classificação atual não é sobrescrita e série usa /tv + content_ratings", async () => {
    const { svc, prisma } = makeService({
      alvo: alvo({ tipo: "SERIE", fonte_id: "1396", classificacao_indicativa: "CATORZE" }),
    });
    (svc as any).pausa = vi.fn(async () => undefined);
    (fetchJson as any).mockImplementation(async (url: string) => {
      expect(url).toContain("/tv/1396?append_to_response=translations,content_ratings");
      return {
        translations: {
          translations: [{ iso_639_1: "en", data: { overview: "EN", name: "Breakin Bad" } }],
        },
        content_ratings: { results: [{ iso_3166_1: "BR", rating: "16" }] },
      };
    });
    await svc.enriquecerLocalizacao(10);
    const data = (prisma.midia.update as any).mock.calls[0][0].data;
    expect("classificacao_indicativa" in data).toBe(false);
    expect(data.sinopse_en).toBe("EN");
    // Certificado regional continua sendo registrado (dado bruto do TMDB).
    expect(prisma.classificacaoRegiao.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { midia_id: "m-1", regiao: "BR", valor: "16", fonte: "tmdb" },
      }),
    );
  });

  it("erro por título vai para falhas SEM watermark (retenta depois)", async () => {
    const { svc, prisma } = makeService({ alvo: alvo() });
    (svc as any).pausa = vi.fn(async () => undefined);
    (fetchJson as any).mockRejectedValue(new Error("TMDB 500"));
    const r = await svc.enriquecerLocalizacao(10);
    expect(r).toEqual({ processados: 1, ok: 0, falhas: 1 });
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("guard de disco bloqueia (D-574) e job em execução não re-entra", async () => {
    const { svc, prisma } = makeService({ alvo: alvo() });
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 5000000000n }];
      return alvo();
    });
    await expect(svc.enriquecerLocalizacao(10)).rejects.toBeInstanceOf(BadRequestException);
    (svc as any).estado.localizacao.executando = true;
    await expect(svc.enriquecerLocalizacao(10)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("drenarLote consome a fila de localização", async () => {
    const { svc, prisma } = makeService({ alvo: [] });
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/sem_elenco/.test(sql)) {
        return [
          {
            sem_elenco: 0,
            sem_temp: 0,
            sem_pais: 0,
            ricos: 0,
            provedores: 0,
            critica_igdb: 0,
            arestas_franquia: 0,
            avaliacao_livros: 0,
            localizacao: 3,
          },
        ];
      }
      return [];
    });
    vi.spyOn(svc, "enriquecerLocalizacao").mockResolvedValue({
      processados: 3,
      ok: 3,
      falhas: 0,
    });
    const r = await svc.drenarLote(60_000);
    expect(r.lotes).toEqual([{ tipo: "localizacao", ok: 3, falhas: 0 }]);
    expect(svc.enriquecerLocalizacao).toHaveBeenCalledWith(2000);
  });
});

// ===========================================================================
// T-DADOS-09 (D9) — gêneros de games no IGDB por id
// ===========================================================================

describe("MAPA_GENEROS_IGDB e generosDoPayload (T-DADOS-09)", () => {
  it("cobre os 23 slugs de /v4/genres e todos os nomes cabem em VarChar(64)", () => {
    const slugs = Object.keys(MAPA_GENEROS_IGDB);
    expect(slugs).toHaveLength(23);
    expect(new Set(slugs).size).toBe(23);
    for (const slug of slugs) {
      expect(slug.length).toBeLessThanOrEqual(LIMITES.generoSlug);
      expect((MAPA_GENEROS_IGDB[slug] ?? "").length).toBeLessThanOrEqual(LIMITES.generoNome);
    }
    // Amostra do mapa editorial (slug IGDB → nome pt-BR).
    expect(MAPA_GENEROS_IGDB["role-playing-rpg"]).toBe("RPG");
    expect(MAPA_GENEROS_IGDB["hack-and-slash-beat-em-up"]).toBe("Hack and Slash");
  });

  it("extrai slug, deriva de name, filtra fora do mapa e deduplica", () => {
    expect(
      generosDoPayload({
        genres: [
          { slug: "adventure", name: "Adventure" },
          { name: "Shooter" },
          { slug: "not-a-real-genre", name: "Nope" },
          { slug: "adventure" },
        ],
      }),
    ).toEqual([{ slug: "adventure" }, { slug: "shooter" }]);
  });

  it("payload sem genres / estranho devolve [] e nunca lança", () => {
    expect(generosDoPayload([{ name: "Sem gênero" }])).toEqual([]);
    expect(generosDoPayload({})).toEqual([]);
    expect(generosDoPayload(null)).toEqual([]);
    expect(generosDoPayload(undefined)).toEqual([]);
    expect(generosDoPayload([])).toEqual([]);
    expect(generosDoPayload({ genres: [null, 42, {}] })).toEqual([]);
  });
});

describe("BackfillService.enriquecerGenerosGames (T-DADOS-09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTokenTwitchIgdb();
    process.env.TWITCH_CLIENT_ID = "client-id-de-teste";
    process.env.TWITCH_CLIENT_SECRET = "segredo-de-teste";
  });

  /** postJson: token do Twitch + resposta do IGDB (nunca toca a rede). */
  function mockIgdb(respostas: any[]) {
    let indice = 0;
    (postJson as any).mockImplementation(async (url: string) => {
      if (url === URL_TOKEN_TWITCH) return { access_token: "tok", expires_in: 3600 };
      const r = respostas[Math.min(indice, respostas.length - 1)];
      indice++;
      if (r instanceof Error) throw r;
      return r;
    });
    return () => indice;
  }

  it("reusa o gênero existente por slug (Aventura) em vez de duplicar", async () => {
    const alvo = [{ id: "m-1", fonte_id: "7346", titulo: "Breath of the Wild" }];
    const { svc, prisma } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    (prisma.genero.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.slug === "aventura" || where.nome === "Aventura") return { id: 7 };
      return null;
    });
    mockIgdb([[{ name: "Zelda", genres: [{ slug: "adventure", name: "Adventure" }] }]]);
    const r = await svc.enriquecerGenerosGames(100);
    expect(r).toEqual({ processados: 1, ok: 1, semGenero: 0, vinculos: 1, falhas: 0 });
    expect(prisma.genero.findUnique).toHaveBeenCalledWith({
      where: { slug: "aventura" },
      select: { id: true },
    });
    expect(prisma.genero.create).not.toHaveBeenCalled();
    expect(prisma.midiaGenero.upsert).toHaveBeenCalledWith({
      where: { midia_id_genero_id: { midia_id: "m-1", genero_id: 7 } },
      create: { midia_id: "m-1", genero_id: 7 },
      update: {},
    });
    const chamadaIgdb = (postJson as any).mock.calls.find((c: any[]) => c[0] === URL_IGDB_GAMES);
    expect(chamadaIgdb[1]).toBe("fields name, genres.name, genres.slug; where id = 7346; limit 1;");
    expect((prisma.midia.update as any).mock.calls[0][0].data.generos_igdb_em).toBeInstanceOf(Date);
  });

  it("cria quando não existe e sobrevive a colisão de unique", async () => {
    const alvo = [{ id: "m-2", fonte_id: "42", titulo: "Jogo de tiro" }];
    const { svc, prisma } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    // 1º lookup (slug) não acha; create colide; lookup pós-colisão acha a linha.
    let lookupsSlug = 0;
    (prisma.genero.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.slug === "tiro") {
        lookupsSlug++;
        return lookupsSlug > 1 ? { id: 11 } : null;
      }
      if (where.nome === "Tiro") return { id: 11 };
      return null;
    });
    (prisma.genero.create as any).mockRejectedValue(new Error("P2002 unique"));
    mockIgdb([[{ name: "Shooter", genres: [{ name: "Shooter" }] }]]);
    const r = await svc.enriquecerGenerosGames(10);
    expect(r).toEqual({ processados: 1, ok: 1, semGenero: 0, vinculos: 1, falhas: 0 });
    expect(prisma.genero.create).toHaveBeenCalledWith({
      data: { nome: "Tiro", slug: "tiro" },
      select: { id: true },
    });
    expect(prisma.midiaGenero.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { midia_id_genero_id: { midia_id: "m-2", genero_id: 11 } },
      }),
    );
    expect((prisma.midia.update as any).mock.calls[0][0].data.generos_igdb_em).toBeInstanceOf(Date);
  });

  it("marca generos_igdb_em mesmo sem gênero (sai da fila)", async () => {
    const alvo = [{ id: "m-3", fonte_id: "999", titulo: "Jogo sem gênero" }];
    const { svc, prisma } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    mockIgdb([[{ name: "Sem gênero" }]]);
    const r = await svc.enriquecerGenerosGames(10);
    expect(r).toEqual({ processados: 1, ok: 0, semGenero: 1, vinculos: 0, falhas: 0 });
    expect(prisma.midiaGenero.upsert).not.toHaveBeenCalled();
    expect((prisma.midia.update as any).mock.calls[0][0].data.generos_igdb_em).toBeInstanceOf(Date);
  });

  it("429 persistente: falha o título e NÃO marca o watermark", async () => {
    const alvo = [{ id: "m-4", fonte_id: "1070", titulo: "Super Mario World" }];
    const { svc, prisma } = makeService({ alvo });
    (svc as any).pausa = vi.fn(async () => undefined);
    mockIgdb([new ErroColeta("HTTP 429 em https://api.igdb.com/v4/games", 429)]);
    const r = await svc.enriquecerGenerosGames(10);
    expect(r).toEqual({ processados: 1, ok: 0, semGenero: 0, vinculos: 0, falhas: 1 });
    expect((postJson as any).mock.calls.filter((c: any[]) => c[0] === URL_IGDB_GAMES)).toHaveLength(
      2,
    );
    expect(prisma.midia.update).not.toHaveBeenCalled();
  });

  it("sem credenciais Twitch → BadRequestException; job em execução não re-entra", async () => {
    const alvo = [{ id: "m-5", fonte_id: "1", titulo: "X" }];
    const { svc } = makeService({ alvo });
    delete process.env.TWITCH_CLIENT_ID;
    await expect(svc.enriquecerGenerosGames(10)).rejects.toBeInstanceOf(BadRequestException);
    process.env.TWITCH_CLIENT_ID = "client-id-de-teste";
    (svc as any).estado.generosGames.executando = true;
    await expect(svc.enriquecerGenerosGames(10)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("drenarLote consome a fila e soma sem_genero ao ok (fila drena)", async () => {
    const { svc, prisma } = makeService({ alvo: [] });
    (prisma.$queryRawUnsafe as any).mockImplementation(async (sql: string) => {
      if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
      if (/sem_elenco/.test(sql)) {
        return [
          {
            sem_elenco: 0,
            sem_temp: 0,
            sem_pais: 0,
            ricos: 0,
            provedores: 0,
            critica_igdb: 0,
            generos_games: 3,
            arestas_franquia: 0,
            avaliacao_livros: 0,
            localizacao: 0,
          },
        ];
      }
      return [];
    });
    vi.spyOn(svc, "enriquecerGenerosGames").mockResolvedValue({
      processados: 3,
      ok: 2,
      semGenero: 1,
      vinculos: 4,
      falhas: 0,
    });
    const r = await svc.drenarLote(60_000);
    expect(r.lotes).toEqual([{ tipo: "generosGames", ok: 3, falhas: 0 }]);
    expect(svc.enriquecerGenerosGames).toHaveBeenCalledWith(2000);
  });
});
