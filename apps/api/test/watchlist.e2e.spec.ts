/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { WatchlistController } from "../src/modules/watchlist/watchlist.controller.js";
import {
  WatchlistService,
  FREE_WATCHLIST_LIMIT,
} from "../src/modules/watchlist/watchlist.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { MetricsService } from "../src/modules/metrics/metrics.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";

const USER_ID = "user-e2e";

function inMemoryPrisma() {
  const entries: any[] = [];
  const interacoes: any[] = [];
  const midias = new Map<string, any>();
  const planos = new Map<string, { plano: string }>();
  const prisma = {
    watchlistEntry: {
      findUnique: async ({ where }: any) =>
        entries.find(
          (e) =>
            e.usuario_id === where.usuario_id_midia_id.usuario_id &&
            e.midia_id === where.usuario_id_midia_id.midia_id,
        ) ?? null,
      findFirst: async ({ where }: any) =>
        entries.find((e) => e.id === where.id && e.usuario_id === where.usuario_id) ?? null,
      findMany: async ({ where }: any) =>
        entries.filter(
          (e) => e.usuario_id === where.usuario_id && (!where.coluna || e.coluna === where.coluna),
        ),
      count: async ({ where }: any) =>
        entries.filter((e) => e.usuario_id === where.usuario_id).length,
      create: async ({ data }: any) => {
        const e = {
          id: randomUUID(),
          created_at: new Date(),
          updated_at: new Date(),
          ...data,
        };
        entries.push(e);
        return e;
      },
      update: async ({ where, data }: any) => {
        const e = entries.find((x) => x.id === where.id);
        if (e) Object.assign(e, data);
        return e;
      },
      delete: async ({ where }: any) => {
        const i = entries.findIndex((x) => x.id === where.id);
        if (i >= 0) entries.splice(i, 1);
      },
    },
    midia: {
      findUnique: async ({ where }: any) => midias.get(where.id) ?? null,
      findMany: async ({ where }: any) =>
        [...midias.values()].filter((m) => !where?.id?.in || where.id.in.includes(m.id)),
    },
    usuarioPlano: { findUnique: async ({ where }: any) => planos.get(where.usuario_id) ?? null },
    // T320/D-309: add/move sincronizam a interação (status derivado da coluna).
    // T027/D-528: findUnique + upsert completos — o move valida a máquina de
    // estados contra o status ATUAL da interação.
    usuarioMidiaInteracao: {
      findUnique: async ({ where }: any) => {
        const k = where.usuario_id_midia_id;
        return (
          interacoes.find((i: any) => i.usuario_id === k.usuario_id && i.midia_id === k.midia_id) ??
          null
        );
      },
      upsert: async ({ where, create, update }: any) => {
        const k = where.usuario_id_midia_id;
        const existente = interacoes.find(
          (i: any) => i.usuario_id === k.usuario_id && i.midia_id === k.midia_id,
        );
        if (existente) {
          Object.assign(existente, update ?? {}, { atualizado_em: new Date() });
          return existente;
        }
        const nova = { id: "inter-" + randomUUID(), ...create };
        interacoes.push(nova);
        return nova;
      },
    },
  };
  return { prisma, entries, midias, planos };
}

/** Simula o AuthGuard real: anexa req.user quando "autenticado"; 401 senão. */
let AUTENTICADO = true;
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!AUTENTICADO) {
      throw new UnauthorizedException("Autenticação necessária.");
    }
    const req = context.switchToHttp().getRequest();
    req.user = { id: USER_ID };
    return true;
  }
}

describe("Watchlist CRUD — e2e via HTTP (T207)", () => {
  let app: NestFastifyApplication;
  let ctx: ReturnType<typeof inMemoryPrisma>;

  beforeAll(async () => {
    ctx = inMemoryPrisma();
    const moduleRef = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [
        WatchlistService,
        { provide: PrismaService, useValue: ctx.prisma },
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
    ctx.entries.length = 0;
    ctx.planos.clear();
    ctx.midias.clear();
  });

  it("POST /watchlist — adiciona mídia (201)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/watchlist")
      .send({ midia_id: randomUUID(), coluna: "WANT" });
    expect(res.status).toBe(201);
    expect(res.body.coluna).toBe("WANT");
  });

  it("POST /watchlist — coluna inválida rejeitada pelo Zod (400)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/watchlist")
      .send({ midia_id: randomUUID(), coluna: "INVALIDA" });
    expect(res.status).toBe(400);
  });

  it("POST /watchlist — duplicata (409)", async () => {
    const midiaId = randomUUID();
    await request(app.getHttpServer()).post("/api/v1/watchlist").send({ midia_id: midiaId });
    const res = await request(app.getHttpServer())
      .post("/api/v1/watchlist")
      .send({ midia_id: midiaId, coluna: "COMPLETED" });
    expect(res.status).toBe(409);
  });

  it("POST /watchlist — FREE no limite (50) → 403 com mensagem de upgrade", async () => {
    ctx.planos.set(USER_ID, { plano: "FREE" });
    for (let i = 0; i < FREE_WATCHLIST_LIMIT; i++) {
      ctx.entries.push({
        id: randomUUID(),
        usuario_id: USER_ID,
        midia_id: randomUUID(),
        coluna: "WANT",
      });
    }
    const res = await request(app.getHttpServer())
      .post("/api/v1/watchlist")
      .send({ midia_id: randomUUID() });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("até 50 itens");
  });

  it("POST /watchlist — PLUS ignora o limite", async () => {
    ctx.planos.set(USER_ID, { plano: "PLUS" });
    for (let i = 0; i < FREE_WATCHLIST_LIMIT; i++) {
      ctx.entries.push({
        id: randomUUID(),
        usuario_id: USER_ID,
        midia_id: randomUUID(),
        coluna: "WANT",
      });
    }
    const res = await request(app.getHttpServer())
      .post("/api/v1/watchlist")
      .send({ midia_id: randomUUID() });
    expect(res.status).toBe(201);
  });

  it("GET /watchlist — lista com filtro por coluna", async () => {
    ctx.entries.push(
      { id: randomUUID(), usuario_id: USER_ID, midia_id: randomUUID(), coluna: "WANT" },
      { id: randomUUID(), usuario_id: USER_ID, midia_id: randomUUID(), coluna: "COMPLETED" },
    );
    const res = await request(app.getHttpServer()).get("/api/v1/watchlist?coluna=COMPLETED");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].coluna).toBe("COMPLETED");
  });

  it("GET /watchlist — coluna inválida → 400", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/watchlist?coluna=INVALIDA");
    expect(res.status).toBe(400);
  });

  it("PATCH /watchlist/:id/move — move entre colunas", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/watchlist")
      .send({ midia_id: randomUUID(), coluna: "WANT" });
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/watchlist/${created.body.id}/move`)
      .send({ coluna: "DROPPED" });
    expect(res.status).toBe(200);
    expect(res.body.coluna).toBe("DROPPED");
  });

  it("PATCH /watchlist/:id/move — D-528: COMPLETED → DROPPED rejeita (400)", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/watchlist")
      .send({ midia_id: randomUUID(), coluna: "COMPLETED" });
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/watchlist/${created.body.id}/move`)
      .send({ coluna: "DROPPED" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("D-528");
  });

  it("DELETE /watchlist/:id — remove (204)", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/watchlist")
      .send({ midia_id: randomUUID() });
    const res = await request(app.getHttpServer()).delete(`/api/v1/watchlist/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it("sem autenticação → 401 (AuthGuard)", async () => {
    AUTENTICADO = false;
    const res = await request(app.getHttpServer()).get("/api/v1/watchlist");
    expect(res.status).toBe(401);
  });

  describe("T285 — PATCH /watchlist/:id (reação/motivo/progresso)", () => {
    it("persiste reação + progresso (200)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/v1/watchlist")
        .send({ midia_id: randomUUID(), coluna: "COMPLETED" });
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/watchlist/${created.body.id}`)
        .send({ reacao: "GOSTEI", progresso_detalhe: "temporada 1 completa" });
      expect(res.status).toBe(200);
      expect(res.body.reacao).toBe("GOSTEI");
      expect(res.body.progresso_detalhe).toBe("temporada 1 completa");
    });

    it("motivo de abandono aceito com o vocabulário do domínio (200)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/v1/watchlist")
        .send({ midia_id: randomUUID() });
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/watchlist/${created.body.id}`)
        .send({ motivo_abandono: "FALTA_TEMPO" });
      expect(res.status).toBe(200);
      expect(res.body.motivo_abandono).toBe("FALTA_TEMPO");
    });

    it("reação inválida → 400 (Zod)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/v1/watchlist")
        .send({ midia_id: randomUUID() });
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/watchlist/${created.body.id}`)
        .send({ reacao: "TALVEZ" });
      expect(res.status).toBe(400);
    });

    it("sem reacao nem motivo → 400 (refine)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/v1/watchlist")
        .send({ midia_id: randomUUID() });
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/watchlist/${created.body.id}`)
        .send({ progresso_detalhe: "só progresso" });
      expect(res.status).toBe(400);
    });

    it("entrada inexistente (ou de outro usuário) → 404", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/watchlist/${randomUUID()}`)
        .send({ reacao: "GOSTEI" });
      expect(res.status).toBe(404);
    });
  });
});
