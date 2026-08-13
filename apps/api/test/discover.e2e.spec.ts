import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { DiscoverModule } from "../src/modules/discover/discover.module.js";
import { MetricsModule } from "../src/modules/metrics/metrics.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";

const ROWS = [
  {
    id: "1",
    titulo: "Matrix",
    tipo: "FILME",
    ano_lancamento: 1999,
    sinopse: "Red pill",
    imagem_url: null,
    genero: "acao",
  },
  {
    id: "2",
    titulo: "Matrix Reloaded",
    tipo: "FILME",
    ano_lancamento: 2003,
    sinopse: "Zion",
    imagem_url: null,
    genero: "acao",
  },
  {
    id: "3",
    titulo: "Cyberpunk 2077",
    tipo: "GAME",
    ano_lancamento: 2020,
    sinopse: "Night City",
    imagem_url: null,
    genero: "rpg",
  },
];

function mockPrisma() {
  const $queryRaw = async (query: { sql: string; values: unknown[] } | string) => {
    const sql = typeof query === "string" ? query : query.sql;
    const values = typeof query === "string" ? [] : query.values;
    let compiled = sql;
    for (const v of values) compiled = compiled.replace(/\?/, JSON.stringify(v));

    if (sql.includes("AS rank") && sql.includes("m.id =")) {
      return ROWS.some((r) => r.id === values[0]) ? [{ rank: 1 }] : [];
    }
    if (sql.includes("COUNT(*)::int AS total")) {
      return [{ total: ROWS.length }];
    }
    const hasQ = sql.includes("to_tsquery") || sql.includes("similarity");
    const q = hasQ
      ? String(values[0] ?? "")
          .replace(/:\*$/g, "")
          .replace(/ & /g, " ")
          .toLowerCase()
      : "";
    let results = ROWS.filter(
      (m) => !q || m.titulo.toLowerCase().includes(q) || m.sinopse.toLowerCase().includes(q),
    );
    const tipoMatch = compiled.match(/tipo = "(\w+)"/);
    if (tipoMatch) results = results.filter((m) => m.tipo === tipoMatch[1]);
    const generoMatch = compiled.match(/g\.slug = "([^"]+)"/);
    if (generoMatch) results = results.filter((m) => m.genero === generoMatch[1]);
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
  return { $queryRaw, midia: { findMany: async () => [] } };
}

const mockSession = {
  validateToken: async () => ({ sessao: { usuario_id: "user-e2e" }, usuario: { id: "user-e2e" } }),
};

describe("Discover — e2e via HTTP (T208)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DiscoverModule, MetricsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma())
      .overrideProvider(SessionService)
      .useValue(mockSession)
      .compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /discover?q=matrix — 200, itens sanitizados (sem campos internos)", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/discover?q=matrix");
    expect(res.status).toBe(200);
    expect(res.body.itens.length).toBeGreaterThan(0);
    expect(res.body.total_estimado).toBe(ROWS.length);
    const chaves = Object.keys(res.body.itens[0]);
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
    expect(res.body.proximo_cursor).toBeDefined();
  });

  it("GET /discover?q=matrix&tipo=FILME — filtra por tipo", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/discover?q=matrix&tipo=FILME");
    expect(res.status).toBe(200);
    res.body.itens.forEach((i: { tipo: string }) => expect(i.tipo).toBe("FILME"));
  });

  it("GET /discover?q= — modo catálogo (q vazio)", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/discover?q=&limit=10");
    expect(res.status).toBe(200);
    expect(res.body.itens.length).toBe(ROWS.length);
  });

  it("GET /discover — q muito longo (201 chars) → 400", async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/discover?q=${"a".repeat(201)}`);
    expect(res.status).toBe(400);
  });

  it("GET /discover — limit acima de 50 → 400", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/discover?limit=100");
    expect(res.status).toBe(400);
  });

  it("GET /discover — cursor não-UUID → 400", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/discover?cursor=nao-uuid");
    expect(res.status).toBe(400);
  });

  it("GET /discover com sessão válida — na_watchlist marcado", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/discover?q=matrix")
      .set("Cookie", "sess=token-valido");
    expect(res.status).toBe(200);
    expect(res.body.itens[0].na_watchlist).toBe(false); // mock: sempre false no row
  });

  it("GET /discover sem sessão — na_watchlist false e nunca 401 (público)", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/discover?q=matrix");
    expect(res.status).toBe(200);
    expect(res.body.itens[0].na_watchlist).toBe(false);
  });
});
