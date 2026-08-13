import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { CanActivate, ExecutionContext } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { InteracoesController } from "../src/modules/interacoes/interacoes.controller.js";
import { InteracoesService } from "../src/modules/interacoes/interacoes.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";

// T308 — regressão HTTP do PUT /interacoes/:midiaId: o pipe Zod deve validar
// SÓ o body (não o @Param string) → "expected object, received string" era o
// bug de produção (método-level @UsePipes validava o param).
const MIDIA = "d6cf3d69-a0d0-4536-bef9-4d4356ed7a5f";

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: "user-1" };
    return true;
  }
}

describe("T308 — PUT /interacoes/:midiaId (HTTP)", () => {
  let app: NestFastifyApplication;
  const upsert = vi.fn(async () => ({ id: "i-1", midia_id: MIDIA, status: "QUERO_CONSUMIR" }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [InteracoesController],
      providers: [
        {
          provide: InteracoesService,
          useValue: { upsert, listar: async () => [], obter: async () => null },
        },
      ],
    })
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

  it("PUT { status } com @Param string não deve dar 'expected object, received string'", async () => {
    upsert.mockClear();
    const res = await request(app.getHttpServer())
      .put(`/api/v1/interacoes/${MIDIA}`)
      .set("Content-Type", "application/json")
      .send({ status: "QUERO_CONSUMIR" });
    expect(res.status).not.toBe(400);
    expect(String(res.body.message ?? res.status)).not.toMatch(/expected object, received string/);
    expect(res.status).toBe(200);
    // Resposta vem do service mock → a requisição chegou no handler (com o
    // body validado) e o @Param string NÃO foi validado contra o schema.
    expect(res.body).toMatchObject({ id: "i-1", midia_id: MIDIA, status: "QUERO_CONSUMIR" });
    const args = upsert.mock.calls[upsert.mock.calls.length - 1];
    expect(args[0]).toBe("user-1");
    expect(args[1]).toBe(MIDIA);
    expect(args[2]).toMatchObject({ status: "QUERO_CONSUMIR" });
  });

  it("PUT { reacao } também passa (body validado, param ignorado)", async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/interacoes/${MIDIA}`)
      .set("Content-Type", "application/json")
      .send({ reacao: "GOSTEI" });
    expect(res.status).not.toBe(400);
    expect(res.status).toBe(200);
  });
});
