/**
 * Item 13 (#148, smoke pós-#160) — id não-UUID em params de rota
 * nunca pode alcançar o Prisma: colunas @db.Uuid explodem P2023 → 500.
 *
 * Contrato: 404 (recurso não encontrado, sem distinguir malformado de
 * inexistente) e o service NUNCA é chamado — a validação é pré-Prisma.
 * Com mock in-memory o service responderia "404 por não achar", então
 * os specs espiam o service: se o spy for chamado, o pipe está ausente.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { CanActivate, ExecutionContext } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { WatchlistController } from "../src/modules/watchlist/watchlist.controller.js";
import { WatchlistService } from "../src/modules/watchlist/watchlist.service.js";
import { InteracoesController } from "../src/modules/interacoes/interacoes.controller.js";
import { InteracoesService } from "../src/modules/interacoes/interacoes.service.js";
import { MetricsService } from "../src/modules/metrics/metrics.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";

const ID_LIXO = "nao-uuid";
const ID_VALIDO = "0f0f5b52-8ea1-4ff2-9e77-c8ef13d1a9b4";

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: "user-404" };
    return true;
  }
}

function espiaoServico(metodos: string[]) {
  const spy: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of metodos) spy[m] = vi.fn();
  return spy;
}

describe("Item 13 — param não-UUID → 404 sem tocar o service", () => {
  let app: NestFastifyApplication;
  let spy: Record<string, ReturnType<typeof vi.fn>>;

  beforeAll(async () => {
    spy = espiaoServico(["move", "registrarReacao", "remove", "relink"]);
    const moduleRef = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [
        { provide: WatchlistService, useValue: spy },
        {
          provide: MetricsService,
          useValue: {
            incrementWatchlistAdd: () => undefined,
            incrementWatchlistMove: () => undefined,
            incrementWatchlistRemove: () => undefined,
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(new FakeAuthGuard())
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false }),
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    for (const fn of Object.values(spy)) (fn as ReturnType<typeof vi.fn>).mockClear();
  });

  it.each([
    ["PATCH", `/api/v1/watchlist/${ID_LIXO}/move`, { coluna: "DROPPED" }, "move"],
    ["PATCH", `/api/v1/watchlist/${ID_LIXO}`, { reacao: "GOSTEI" }, "registrarReacao"],
    ["DELETE", `/api/v1/watchlist/${ID_LIXO}`, undefined, "remove"],
    ["PATCH", `/api/v1/watchlist/${ID_LIXO}/relink`, { midia_id: ID_VALIDO }, "relink"],
  ])("%s %s → 404 e service não chamado", async (metodo, url, body, metodoServico) => {
    const req = request(app.getHttpServer())[metodo.toLowerCase() as "patch" | "delete"](url);
    const res = await (body ? req.send(body) : req);
    expect(res.status).toBe(404);
    expect(spy[metodoServico as "move"]).not.toHaveBeenCalled();
  });

  it("UUID válido passa pelo pipe e chega ao service (sem falso 404)", async () => {
    (spy.move as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/watchlist/${ID_VALIDO}/move`)
      .send({ coluna: "WATCHING" });
    expect(res.status).toBe(200);
    expect(spy.move).toHaveBeenCalledOnce();
  });
});

describe("Item 13 — interações :midiaId não-UUID → 404 sem tocar o service", () => {
  let app: NestFastifyApplication;
  let spy: Record<string, ReturnType<typeof vi.fn>>;

  beforeAll(async () => {
    spy = espiaoServico(["obter", "upsert"]);
    const moduleRef = await Test.createTestingModule({
      controllers: [InteracoesController],
      providers: [
        { provide: InteracoesService, useValue: spy },
        {
          provide: MetricsService,
          useValue: { incrementWatchlistAdd: () => undefined },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(new FakeAuthGuard())
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false }),
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    for (const fn of Object.values(spy)) (fn as ReturnType<typeof vi.fn>).mockClear();
  });

  it("GET /interacoes/:midiaId lixo → 404 e service não chamado", async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/interacoes/${ID_LIXO}`);
    expect(res.status).toBe(404);
    expect(spy.obter).not.toHaveBeenCalled();
  });

  it("PUT /interacoes/:midiaId lixo → 404 e service não chamado", async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/interacoes/${ID_LIXO}`)
      .send({ status: "CONSUMINDO" });
    expect(res.status).toBe(404);
    expect(spy.upsert).not.toHaveBeenCalled();
  });

  it("UUID válido chega ao service (sem falso 404)", async () => {
    (spy.obter as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ status: "CONSUMINDO" });
    const res = await request(app.getHttpServer()).get(`/api/v1/interacoes/${ID_VALIDO}`);
    expect(res.status).toBe(200);
    expect(spy.obter).toHaveBeenCalledOnce();
  });
});
