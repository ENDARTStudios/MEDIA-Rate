import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { DiscoverService } from "../src/modules/discover/discover.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

interface MockRow {
  id: string;
  titulo: string;
  tipo: string;
  ano_lancamento: number;
  sinopse: string;
  imagem_url: string | null;
  genero?: string;
}

interface MockDiscoverPrisma {
  readonly lastRawQuery: string | undefined;
  readonly queries: string[];
  $queryRaw: (
    query: { sql: string; values: unknown[] } | string,
  ) => Promise<Record<string, unknown>[]>;
  midia: {
    findMany: (args: {
      where?: { tipo?: string };
      orderBy?: { score?: unknown };
      take?: number;
    }) => Promise<MockRow[]>;
  };
}

const DB: MockRow[] = [
  {
    id: "1",
    titulo: "The Shawshank Redemption",
    tipo: "FILME",
    ano_lancamento: 1994,
    sinopse: "Prison drama",
    imagem_url: null,
    genero: "drama",
  },
  {
    id: "2",
    titulo: "Breaking Bad",
    tipo: "SERIE",
    ano_lancamento: 2008,
    sinopse: "Chemistry teacher",
    imagem_url: null,
    genero: "drama",
  },
  {
    id: "3",
    titulo: "Inception",
    tipo: "FILME",
    ano_lancamento: 2010,
    sinopse: "Dream heist",
    imagem_url: null,
    genero: "acao",
  },
  {
    id: "4",
    titulo: "Interstellar",
    tipo: "FILME",
    ano_lancamento: 2014,
    sinopse: "Space travel",
    imagem_url: null,
    genero: "ficcao",
  },
  {
    id: "5",
    titulo: "Matrix",
    tipo: "FILME",
    ano_lancamento: 1999,
    sinopse: "Red pill",
    imagem_url: null,
    genero: "acao",
  },
  {
    id: "6",
    titulo: "John Wick 4: Baba Yaga",
    tipo: "FILME",
    ano_lancamento: 2023,
    sinopse: "Ação de tirar o fôlego",
    imagem_url: null,
    genero: "acao",
  },
  {
    id: "7",
    titulo: "Coração Partido",
    tipo: "FILME",
    ano_lancamento: 2021,
    sinopse: "Drama",
    imagem_url: null,
    genero: "drama",
  },
];

function makePrisma(rows: MockRow[] = DB) {
  let lastRawQuery: string | undefined;
  const queries: string[] = [];
  const $queryRaw = async (query: { sql: string; values: unknown[] } | string) => {
    const sql = typeof query === "string" ? query : query.sql;
    const values = typeof query === "string" ? [] : query.values;
    lastRawQuery = sql;
    queries.push(sql);
    let compiled = sql;
    for (const v of values) compiled = compiled.replace(/\?/, JSON.stringify(v));

    // Cursor pre-query (rank do item-cursor).
    if (sql.includes("AS rank") && sql.includes("m.id =")) {
      const cursorId = values[0];
      return rows.some((r) => r.id === cursorId) ? [{ rank: 1 }] : [];
    }
    // Total estimado.
    if (sql.includes("COUNT(*)::int AS total")) {
      return [{ total: matchedCount(compiled, rows) }];
    }

    // q só existe em modo busca (tsvector ou pg_trgm) — no modo catálogo o
    // primeiro parâmetro é o LIMIT.
    const hasQ = sql.includes("plainto_tsquery") || sql.includes("similarity");
    const rawQ = hasQ ? (values[0] as string) : "";
    // T223/T227: espelha o translate() do backend — acentos removidos nos
    // DOIS lados (coluna gerada e termo) → 'acao' e 'ação' casam igual.
    const q = rawQ ? rawQ.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    let results = rows.filter(
      (m) =>
        !q ||
        m.titulo
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(q) ||
        m.sinopse
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(q),
    );
    const tipoMatch = compiled.match(/tipo = "(\w+)"/);
    if (tipoMatch) results = results.filter((m) => m.tipo === tipoMatch[1]);
    const generoMatch = compiled.match(/g\.slug = "([^"]+)"/);
    if (generoMatch) results = results.filter((m) => m.genero === generoMatch[1]);
    const cursorMatch = compiled.match(/::real, "([^"]+)"/);
    if (cursorMatch) results = results.filter((m) => m.id > cursorMatch[1]);
    // Último LIMIT da query (o primeiro é do LATERAL join interno).
    const limits = compiled.match(/LIMIT (\d+)/g);
    const limit = limits ? parseInt(limits[limits.length - 1].replace("LIMIT ", ""), 10) : 20;
    results = results.slice(0, limit);

    return results.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      ano_lancamento: r.ano_lancamento,
      poster_url: r.imagem_url,
      score: null,
      na_watchlist: false,
    }));
  };

  function matchedCount(compiled: string, allRows: MockRow[]): number {
    const tipoMatch = compiled.match(/tipo = "(\w+)"/);
    const generoMatch = compiled.match(/g\.slug = "([^"]+)"/);
    // T227: o COUNT do discover inclui o matchSql de q — extrai o termo do
    // SQL COMPILADO (valores já substituídos) e filtra normalizado.
    const termoMatch = compiled.match(
      /plainto_tsquery\('portuguese', translate\("([^"]*)"/,
    );
    const termo = termoMatch?.[1];
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return allRows.filter((m) => {
      if (tipoMatch && m.tipo !== tipoMatch[1]) return false;
      if (generoMatch && m.genero !== generoMatch[1]) return false;
      if (termo != null) {
        const q = norm(termo);
        if (
          q &&
          !norm(m.titulo).includes(q) &&
          !norm(m.sinopse).includes(q)
        ) {
          return false;
        }
      }
      return true;
    }).length;
  }

  return {
    get lastRawQuery() {
      return lastRawQuery;
    },
    get queries() {
      return queries;
    },
    $queryRaw,
    midia: {
      findMany: async (args: {
        where?: { tipo?: string };
        orderBy?: { score?: unknown };
        take?: number;
      }) => {
        let items = [...rows];
        if (args.where?.tipo) items = items.filter((m) => m.tipo === args.where.tipo);
        if (args.orderBy?.score) items.sort(() => -1);
        return items.slice(0, args.take ?? 20);
      },
    },
  };
}

describe("DiscoverService (unit)", () => {
  let service: DiscoverService;
  let prisma: MockDiscoverPrisma;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoverService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<DiscoverService>(DiscoverService);
  });

  it("search — retorna resultados por título", async () => {
    const result = await service.search("Shawshank");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].titulo).toContain("Shawshank");
  });

  it("search — termo sem resultados retorna array vazio", async () => {
    const result = await service.search("zzzz");
    expect(result.items.length).toBe(0);
    expect(result.total).toBe(0);
  });

  it("search — respeita limite", async () => {
    const result = await service.search("a", { limit: 2 });
    expect(result.items.length).toBeLessThanOrEqual(2);
  });

  it("search — filtra por tipo", async () => {
    const result = await service.search("a", { tipo: "FILME" });
    result.items.forEach((m: { tipo: string }) => expect(m.tipo).toBe("FILME"));
  });

  it("search — parametriza o filtro de tipo (Prisma.sql, sem interpolar input)", async () => {
    await service.search("a", { tipo: "FILME" });
    expect(prisma.lastRawQuery).toBeDefined();
    expect(prisma.lastRawQuery?.includes("FILME")).toBe(false);
  });

  // ---------------- T208: discover (tsvector/pg_trgm + cursor) ----------------

  it("discover — busca por título (tsvector) com saída sanitizada", async () => {
    const result = await service.discover({ q: "inception" });
    expect(result.itens.length).toBeGreaterThan(0);
    expect(result.itens[0].titulo).toBe("Inception");
    // Sanitização: nunca expor campos internos.
    const chaves = Object.keys(result.itens[0]);
    expect(chaves).toEqual(
      expect.arrayContaining([
        "id",
        "titulo",
        "tipo",
        "ano",
        "poster_url",
        "score",
        "na_watchlist",
        "slug",
      ]),
    );
    expect(chaves).not.toContain("sinopse");
    expect(chaves).not.toContain("fonte_id");
    expect(chaves).not.toContain("created_at");
    expect(chaves).not.toContain("updated_at");
  });

  it("discover — termo curto (<3 chars) usa fallback pg_trgm (similarity %)", async () => {
    await service.discover({ q: "ma" });
    expect(prisma.lastRawQuery).toContain("%");
  });

  it("discover — combina filtro de tipo", async () => {
    const result = await service.discover({ q: "inception", tipo: "FILME" });
    expect(result.itens.length).toBeGreaterThan(0);
    expect(result.itens[0].tipo).toBe("FILME");
  });

  it("discover — combina filtro de gênero (slug)", async () => {
    const result = await service.discover({ q: "a", genero: "acao" });
    expect(result.itens.length).toBeGreaterThan(0);
    result.itens.forEach((i: { titulo: string }) =>
      expect(["Inception", "Matrix", "John Wick 4: Baba Yaga"]).toContain(i.titulo),
    );
  });

  it("discover — q vazio retorna lista paginada (modo catálogo)", async () => {
    const result = await service.discover({ limit: 2 });
    expect(result.itens.length).toBe(2);
    expect(result.total_estimado).toBe(DB.length);
  });

  it("discover — paginação cursor: próxima página a partir do último id", async () => {
    const p1 = await service.discover({ limit: 2 });
    expect(p1.itens.length).toBe(2);
    expect(p1.proximo_cursor).toBe(p1.itens[1].id);
    const p2 = await service.discover({ limit: 2, cursor: p1.proximo_cursor });
    expect(p2.itens.length).toBeGreaterThan(0);
    expect(p2.itens[0].id).not.toBe(p1.itens[0].id);
  });

  it("discover — cursor inexistente retorna página vazia (sem fabricar)", async () => {
    const result = await service.discover({ cursor: "999" });
    expect(result.itens).toEqual([]);
    expect(result.total_estimado).toBe(0);
  });

  it("discover — na_watchlist parametrizado (usuarioId nunca concatenado no SQL)", async () => {
    await service.discover({ q: "matrix", usuarioId: "user-123" });
    // A query principal contém o EXISTS da watchlist...
    expect(prisma.queries.some((q) => q.includes("watchlist_entry"))).toBe(true);
    // ...mas o valor do usuário NUNCA é concatenado (sempre parâmetro).
    expect(prisma.queries.some((q) => q.includes("user-123"))).toBe(false);
  });

  it("discover — trending usa modo catálogo", async () => {
    const result = await service.trending({ limit: 3 });
    expect(result.itens.length).toBeLessThanOrEqual(3);
  });

  // ---------------- T227: paridade de acentos (busca normalizada) ----------------

  it("T227 — 'acao' e 'ação' retornam o MESMO conjunto no discover (translate nos dois lados)", async () => {
    const semAcento = await service.discover({ q: "acao" });
    const comAcento = await service.discover({ q: "ação" });
    const idsSem = semAcento.itens.map((i: { id: string }) => i.id).sort();
    const idsCom = comAcento.itens.map((i: { id: string }) => i.id).sort();
    expect(idsCom).toEqual(idsSem);
    expect(idsSem.length).toBeGreaterThan(0);
    // Pelo menos John Wick (sinopse "Ação") aparece nas duas buscas.
    expect(semAcento.itens.some((i: { titulo: string }) => i.titulo.includes("John Wick"))).toBe(true);
  });

  it("T227 — /search (legado) delega ao discover: paridade 'acao' ≡ 'ação' e formato items/total", async () => {
    const semAcento = await service.search("acao");
    const comAcento = await service.search("ação");
    const idsSem = semAcento.items.map((i: { id: string }) => i.id).sort();
    const idsCom = comAcento.items.map((i: { id: string }) => i.id).sort();
    expect(idsCom).toEqual(idsSem);
    expect(semAcento.items.length).toBeGreaterThan(0);
    // Formato legado preservado (catálogo web espera items + total).
    expect(semAcento.items[0]).toHaveProperty("titulo");
    expect(semAcento.items[0]).toHaveProperty("ano_lancamento");
    expect(semAcento.items[0]).toHaveProperty("imagem_url");
    expect(semAcento.items[0]).toHaveProperty("slug");
    expect(semAcento.total).toBeGreaterThan(0);
  });

  it("T227 — busca por título exato continua funcionando (sem regressão)", async () => {
    const result = await service.discover({ q: "Inception" });
    expect(result.itens.length).toBeGreaterThan(0);
    expect(result.itens[0].titulo).toBe("Inception");
  });

  // ---------------- T229: verificação de paridade no /search (produção) ----------------

  it("T229 — /search: termo SEM acento encontra título COM acento (Coração Partido por 'coracao')", async () => {
    const semAcento = await service.search("coracao");
    const comAcento = await service.search("coração");
    expect(semAcento.items.length).toBeGreaterThan(0);
    // Não-regressão do caso real do Operador: 'coracao' acha 'Coração Partido'.
    expect(
      semAcento.items.some((i: { titulo: string }) => i.titulo === "Coração Partido"),
    ).toBe(true);
    // Paridade no /search (mesmo conjunto para as duas grafias).
    const idsSem = semAcento.items.map((i: { id: string }) => i.id).sort();
    const idsCom = comAcento.items.map((i: { id: string }) => i.id).sort();
    expect(idsCom).toEqual(idsSem);
  });

  it("T229 — /search: termo SEM acento encontra sinopse COM acento (John Wick por 'acao')", async () => {
    const result = await service.search("acao");
    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.some((i: { titulo: string }) => i.titulo.includes("John Wick")),
    ).toBe(true);
  });

  it("T229 — /search: paridade 'acao' ≡ 'ação' retorna conjunto não-vazio idêntico", async () => {
    const semAcento = await service.search("acao");
    const comAcento = await service.search("ação");
    expect(semAcento.items.length).toBeGreaterThan(0);
    expect(comAcento.items.length).toBe(semAcento.items.length);
    const idsSem = semAcento.items.map((i: { id: string }) => i.id).sort();
    const idsCom = comAcento.items.map((i: { id: string }) => i.id).sort();
    expect(idsCom).toEqual(idsSem);
  });
});
