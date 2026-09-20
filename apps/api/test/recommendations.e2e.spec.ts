/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import { CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { RecommendationsModule } from "../src/modules/recommendations/recommendations.module.js";
import { MetricsModule } from "../src/modules/metrics/metrics.module.js";
import { PlanGuard } from "../src/common/guards/plan.guard.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";

const USER_ID = "user-e2e";

const MIDIAS: any[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    titulo: "Filme Ação 1",
    tipo: "FILME",
    ano_lancamento: 2020,
    imagem_url: null,
    score: 8.5,
    generos: [{ genero: { slug: "acao" } }],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    titulo: "Filme Ação 2",
    tipo: "FILME",
    ano_lancamento: 2021,
    imagem_url: null,
    score: 8.0,
    generos: [{ genero: { slug: "acao" } }],
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    titulo: "Filme Drama 1",
    tipo: "FILME",
    ano_lancamento: 2019,
    imagem_url: null,
    score: 9.0,
    generos: [{ genero: { slug: "drama" } }],
  },
  {
    id: "x1",
    titulo: "Filme Colab",
    tipo: "FILME",
    ano_lancamento: 2023,
    imagem_url: null,
    score: 8.2,
    generos: [{ genero: { slug: "acao" } }],
  },
];

let ENTRIES: { usuario_id: string; midia_id: string }[] = [];
const PLANOS = new Map<string, { plano: string; status: string }>();
let AUTENTICADO = true;
// Usuário da sessão simulada — ÚNICO por teste (o PlanGuard tem cache de 60s
// por usuario_id; id fresco evita colisão de cache entre testes).
let USUARIO_ATUAL = USER_ID;

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!AUTENTICADO) throw new UnauthorizedException("Autenticação necessária.");
    context.switchToHttp().getRequest().user = { id: USUARIO_ATUAL };
    return true;
  }
}

function mockPrisma() {
  return {
    watchlistEntry: {
      findMany: async (args: any) => {
        const where = args.where ?? {};
        let out = ENTRIES;
        if (where.usuario_id && typeof where.usuario_id === "string") {
          out = out.filter((e) => e.usuario_id === where.usuario_id);
        }
        if (where.usuario_id?.in)
          out = out.filter((e) => where.usuario_id.in.includes(e.usuario_id));
        if (where.midia_id?.in) out = out.filter((e) => where.midia_id.in.includes(e.midia_id));
        return out.map((e) => ({ ...e }));
      },
    },
    midia: {
      findMany: async (args: any) => {
        let items = [...MIDIAS];
        const where = args.where ?? {};
        if (where.id?.in) items = items.filter((m) => where.id.in.includes(m.id));
        if (where.OR) {
          items = items.filter((m) =>
            where.OR.some(
              (c: any) =>
                m.tipo === c.tipo &&
                m.generos.some((g: any) => g.genero.slug === c.generos.some.genero.slug),
            ),
          );
        }
        if (where.NOT?.id?.in) items = items.filter((m) => !where.NOT.id.in.includes(m.id));
        if (where.score?.gte != null)
          items = items.filter((m) => (m.score ?? 0) >= where.score.gte);
        if (args.cursor) {
          const cursorId = typeof args.cursor === "string" ? args.cursor : args.cursor.id;
          const i = items.findIndex((m) => m.id === cursorId);
          if (i >= 0) items = items.slice(i + (args.skip ?? 1));
        }
        items = [...items].sort(
          (a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.id < b.id ? -1 : 1),
        );
        return items.slice(0, args.take ?? 20);
      },
    },
    usuarioPlano: { findUnique: async ({ where }: any) => PLANOS.get(where.usuario_id) ?? null },
    // T417: interações (status/rating) — default vazio no e2e.
    usuarioMidiaInteracao: { findMany: async () => [] },
  };
}

describe("Recommendations — e2e via HTTP (T209)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RecommendationsModule, MetricsModule],
      providers: [
        // Mesma ordem do app real: AuthGuard global primeiro (seta req.user),
        // depois RolesGuard, depois PlanGuard (lê o usuário).
        { provide: APP_GUARD, useValue: new FakeAuthGuard() },
        { provide: APP_GUARD, useClass: PlanGuard },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma())
      .overrideGuard(AuthGuard)
      .useValue(new FakeAuthGuard())
      .compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    AUTENTICADO = true;
    ENTRIES = [];
    PLANOS.clear();
    USUARIO_ATUAL = `user-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  });

  it("GET /premium/recommendations (PLUS) — recomendações por gênero com motivo", async () => {
    PLANOS.set(USUARIO_ATUAL, { plano: "PLUS", status: "ATIVA" });
    ENTRIES = [
      { usuario_id: USUARIO_ATUAL, midia_id: "22222222-2222-4222-8222-222222222222" },
      { usuario_id: USUARIO_ATUAL, midia_id: "33333333-3333-4333-8333-333333333333" },
    ];
    const res = await request(app.getHttpServer()).get("/api/v1/premium/recommendations");
    expect(res.status).toBe(200);
    expect(res.body.recomendacoes.length).toBeGreaterThan(0);
    expect(res.body.recomendacoes[0].motivo).toContain("Mesmo gênero");
    const chaves = Object.keys(res.body.recomendacoes[0]);
    expect(chaves).toEqual(["id", "titulo", "tipo", "ano", "poster_url", "score", "motivo"]);
  });

  it("GET /premium/recommendations (PLUS) — watchlist vazia → 200 com mensagem", async () => {
    PLANOS.set(USUARIO_ATUAL, { plano: "PLUS", status: "ATIVA" });
    const res = await request(app.getHttpServer()).get("/api/v1/premium/recommendations");
    expect(res.status).toBe(200);
    expect(res.body.recomendacoes).toEqual([]);
    expect(res.body.mensagem).toContain("Adicione itens à sua watchlist");
  });

  it("GET /premium/recommendations (FREE) — 402 Payment Required (PlanGuard)", async () => {
    PLANOS.set(USUARIO_ATUAL, { plano: "FREE", status: "ATIVA" });
    const res = await request(app.getHttpServer()).get("/api/v1/premium/recommendations");
    expect(res.status).toBe(402);
    expect(res.body.message).toContain("PLUS");
  });

  it("GET /premium/ml-personalized (PREMIUM) — colaborativo com frequência agregada", async () => {
    PLANOS.set(USUARIO_ATUAL, { plano: "PREMIUM", status: "ATIVA" });
    ENTRIES = [
      { usuario_id: USUARIO_ATUAL, midia_id: "11111111-1111-4111-8111-111111111111" },
      { usuario_id: USUARIO_ATUAL, midia_id: "22222222-2222-4222-8222-222222222222" },
      { usuario_id: USUARIO_ATUAL, midia_id: "33333333-3333-4333-8333-333333333333" },
      { usuario_id: "outro1", midia_id: "11111111-1111-4111-8111-111111111111" },
      { usuario_id: "outro1", midia_id: "22222222-2222-4222-8222-222222222222" },
      { usuario_id: "outro1", midia_id: "33333333-3333-4333-8333-333333333333" },
      { usuario_id: "outro1", midia_id: "x1" },
    ];
    const res = await request(app.getHttpServer()).get("/api/v1/premium/ml-personalized");
    expect(res.status).toBe(200);
    expect(res.body.recomendacoes.length).toBeGreaterThan(0);
    expect(res.body.recomendacoes[0].id).toBe("x1");
    expect(res.body.recomendacoes[0].motivo).toContain("Popular entre usuários");
    // Nunca expõe a watchlist de outros usuários.
    expect(JSON.stringify(res.body)).not.toContain("outro1");
  });

  it("GET /premium/ml-personalized (PREMIUM) — sem similares → fallback PLUS", async () => {
    PLANOS.set(USUARIO_ATUAL, { plano: "PREMIUM", status: "ATIVA" });
    ENTRIES = [
      { usuario_id: USUARIO_ATUAL, midia_id: "22222222-2222-4222-8222-222222222222" },
      { usuario_id: USUARIO_ATUAL, midia_id: "33333333-3333-4333-8333-333333333333" },
      { usuario_id: "outro1", midia_id: "22222222-2222-4222-8222-222222222222" },
      { usuario_id: "outro1", midia_id: "33333333-3333-4333-8333-333333333333" },
    ];
    const res = await request(app.getHttpServer()).get("/api/v1/premium/ml-personalized");
    expect(res.status).toBe(200);
    expect(res.body.recomendacoes[0].motivo).toContain("Mesmo gênero");
  });

  it("GET /premium/ml-personalized (PLUS) — 402 (exige PREMIUM)", async () => {
    PLANOS.set(USUARIO_ATUAL, { plano: "PLUS", status: "ATIVA" });
    const res = await request(app.getHttpServer()).get("/api/v1/premium/ml-personalized");
    expect(res.status).toBe(402);
    expect(res.body.message).toContain("PREMIUM");
  });

  it("GET /premium/recommendations — limit acima de 50 → 400", async () => {
    PLANOS.set(USUARIO_ATUAL, { plano: "PLUS", status: "ATIVA" });
    const res = await request(app.getHttpServer()).get("/api/v1/premium/recommendations?limit=100");
    expect(res.status).toBe(400);
  });

  it("GET /premium/recommendations — sem autenticação → 401", async () => {
    AUTENTICADO = false;
    const res = await request(app.getHttpServer()).get("/api/v1/premium/recommendations");
    expect(res.status).toBe(401);
  });
});
