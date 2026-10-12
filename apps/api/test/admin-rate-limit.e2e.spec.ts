import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";

/**
 * T203 — rate limit admin (superfície /api/v1/admin/*):
 * - leituras 60/min, destrutivas 10/min (aplicarRateLimitAdmin via onRoute);
 * - burst anônimo atinge o 429 do rate limit ANTES dos guards (401/403) —
 *   prova que o limite existe e que NÃO há bypass de autorização (o burst não
 *   executa nada: sem mutação, só contagens);
 * - corpo 429 sanitizado (sem stack/detalhe interno).
 * Sem credenciais reais; nenhuma mutação (401/429 apenas).
 */
describe("Rate Limit admin (T203)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    // Global alto (500/min) para não interferir — o que se testa é o LIMITE ADMIN.
    await applySecurityToAdapter(adapter, {
      isProduction: false,
      allowedOrigins: ["http://localhost:3000"],
      apiPerMinute: 500,
    });
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  }, 60_000);

  afterAll(async () => {
    if (!app) return;
    try {
      await app.close();
    } catch {
      // teardown falho ignorado
    }
  });

  it("burst anônimo na destrutiva admin: 11ª requisição é 429 (limite 10/min) — antes do 401", async () => {
    let ultimoStatus = 0;
    let viu401 = 0;
    for (let i = 0; i < 11; i++) {
      const r = await request(app.getHttpServer()).post("/api/v1/admin/lgpd/purge");
      ultimoStatus = r.status;
      if (r.status === 401) viu401++;
      if (i === 0) {
        // 1ª requisição: rate limit conta, AuthGuard nega (sem mutação).
        expect(r.status).toBe(401);
      }
    }
    expect(viu401).toBe(10); // as 10 primeiras passam pelo limite e caem no guard
    expect(ultimoStatus).toBe(429); // a 11ª é barrada pelo limite destrutivo
  });

  it("corpo 429 sanitizado: sem stack, sem detalhe interno, mensagem genérica", async () => {
    // Independente do teste anterior: força o próprio 429.
    let r;
    for (let i = 0; i < 15; i++) {
      r = await request(app.getHttpServer()).post("/api/v1/admin/lgpd/purge");
      if (r.status === 429) break;
    }
    expect(r?.status).toBe(429);
    expect(r?.body.statusCode).toBe(429);
    // Contrato REAL do plugin v11 (throw do builder → handler de erro do Fastify):
    // {statusCode, message} genérica — sem stack/rota interna/detalhe de store.
    expect(String(r?.body.message)).toMatch(/Limite de \d+ requisicoes/);
    const bruto = JSON.stringify(r?.body);
    expect(bruto).not.toContain("stack");
    expect(bruto).not.toContain("at ");
    expect(bruto).not.toContain("/api/");
  });

  it("leituras admin: 61ª requisição anônima é 429 (limite 60/min)", async () => {
    let ultimoStatus = 0;
    for (let i = 0; i < 61; i++) {
      const r = await request(app.getHttpServer()).get("/api/v1/admin/stats");
      ultimoStatus = r.status;
    }
    expect(ultimoStatus).toBe(429);
  });

  it("rota não-admin não herda o limite admin (100º GET público ≠ 429 admin)", async () => {
    // /health com apiPerMinute=500: mesmo após os bursts acima, chaves são
    // por rota — /health tem quota própria e NÃO pode ter herdado limite admin.
    const r = await request(app.getHttpServer()).get("/health");
    expect(r.status).not.toBe(429);
  });
});
