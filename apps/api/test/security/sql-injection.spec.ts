import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../../src/app.module.js";
import { PrismaService } from "../../src/prisma/prisma.service.js";
import { applySecurityToAdapter } from "../helpers/apply-security.js";

function noStackOrInternal(body: unknown): void {
  const text = JSON.stringify(body);
  expect(text).not.toContain("PrismaClientKnownRequestError");
  expect(text).not.toContain('stack":');
  expect(text).not.toMatch(/at\s+.*(?:node_modules|:\d+:\d+)/);
}

describe("Regressao SQL Injection (T024/8.8)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.SKIP_DB_CONNECT = "true";
    // GET /api/v1/midias é público desde a Fase de catálogo — sem DB no
    // teste, stubamos o Prisma para a query executar contra lista vazia.
    // GET /api/v1/search também é público (mesmo fluxo via $queryRaw).
    const prismaStub = {
      midia: { findMany: async () => [] },
      $queryRaw: async () => [],
      // Demais models nunca são consultados neste spec (login falha na
      // validação zod antes de tocar o banco).
    };
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    const adapter = new FastifyAdapter({ logger: false, bodyLimit: 1_048_576 });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await applySecurityToAdapter(adapter, {
      isProduction: false,
      allowedOrigins: ["http://localhost:3000"],
      apiPerMinute: 100,
    });
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const injectionPayloads = [
    "' OR 1=1 --",
    '\'; DROP TABLE "Midia"; --',
    '1 UNION SELECT * FROM "Usuario"',
    'Robert\'); DROP TABLE "Midia";--',
    "' OR '1'='1",
    "admin'--",
    '1; DELETE FROM "Usuario" WHERE 1=1',
  ];

  describe("GET /api/v1/search?q= (busca por similaridade)", () => {
    for (const payload of injectionPayloads) {
      it(`rejeita ou retorna vazio para "${payload.slice(0, 30)}..."`, async () => {
        const r = await request(app.getHttpServer()).get(
          `/api/v1/search?q=${encodeURIComponent(payload)}`,
        );
        expect(r.status).not.toBe(500);
        noStackOrInternal(r.body);
      });
    }
  });

  describe("GET /api/v1/search?tipo= (filtro — regressao da injecao)", () => {
    // A rota exige autenticação (401); a validação zod do tipo é coberta
    // em discover-controller.spec.ts. Aqui garantimos que nenhum payload
    // malicioso produz erro de servidor/stack vazado.
    for (const payload of injectionPayloads) {
      it(`rejeita ou trata graciosamente "${payload.slice(0, 30)}..."`, async () => {
        const r = await request(app.getHttpServer()).get(
          `/api/v1/search?q=test&tipo=${encodeURIComponent(payload)}`,
        );
        expect(r.status).not.toBe(500);
        noStackOrInternal(r.body);
      });
    }
  });

  describe("POST /api/v1/auth/login (email)", () => {
    for (const payload of injectionPayloads) {
      it(`rejeita ou trata graciosamente "${payload.slice(0, 30)}..."`, async () => {
        const r = await request(app.getHttpServer())
          .post("/api/v1/auth/login")
          .send({ email: payload, password: "test123" })
          .set("Content-Type", "application/json");
        expect(r.status).not.toBe(500);
        noStackOrInternal(r.body);
      });
    }
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("trata SQL injection no campo email", async () => {
      const r = await request(app.getHttpServer())
        .post("/api/v1/auth/forgot-password")
        .send({ email: "' OR 1=1 --" })
        .set("Content-Type", "application/json");
      expect(r.status).not.toBe(500);
      noStackOrInternal(r.body);
    });
  });

  describe("Validacao de parametros", () => {
    it("parametros com SQL injection sao tratados como texto normal", async () => {
      const r = await request(app.getHttpServer()).get(
        '/api/v1/midias?type=\'; DROP TABLE "Midia";--',
      );
      expect(r.status).not.toBe(500);
      noStackOrInternal(r.body);
    });
  });

  it("erro generico nunca expoe nomes de tabela", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "x' UNION SELECT * FROM Usuario --", password: "x" })
      .set("Content-Type", "application/json");
    const body = JSON.stringify(r.body);
    expect(body).not.toContain("Usuario");
    expect(body).not.toContain("Midia");
  });
});
