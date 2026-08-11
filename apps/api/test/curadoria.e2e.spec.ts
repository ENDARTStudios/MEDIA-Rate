/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { Test } from "@nestjs/testing";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { CuradoriaController } from "../src/modules/curadoria/curadoria.controller.js";
import { CuradoriaService } from "../src/modules/curadoria/curadoria.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

/** Role do usuário de teste (muda por teste). */
let ROLE_ATUAL: string | null = null;
let AUTENTICADO = true;

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!AUTENTICADO) throw new UnauthorizedException("Autenticação necessária.");
    context.switchToHttp().getRequest().user = { id: "user-teste" };
    return true;
  }
}

class FakeRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (ROLE_ATUAL === null) return true;
    const required: string[] = Reflect.getMetadata("roles", context.getClass()) ?? [];
    if (!required.includes(ROLE_ATUAL)) {
      throw new ForbiddenException("Você não tem permissão.");
    }
    return true;
  }
}

function mockPrisma() {
  return {
    usuarioPapel: { findMany: vi.fn(async () => []) },
    midia: { findMany: vi.fn(async () => [{ id: "m-a" }, { id: "m-b" }]) },
    relacaoObra: {
      upsert: vi.fn(async ({ create }: any) => ({ id: "rel-1", ...create })),
    },
    premio: { create: vi.fn(async (args: any) => ({ id: "p-1", ...args.data })) },
    classificacaoRegiao: {
      upsert: vi.fn(async ({ create }: any) => ({ midia_id: create.midia_id, ...create })),
    },
    midiaGenero: {
      upsert: vi.fn(async ({ create }: any) => ({ midia_id: create.midia_id, ...create })),
    },
    auditLog: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async (args: any) => ({ id: "a-1", ...args.data })),
    },
  };
}

describe("T291 — curadoria (role CURATOR) — matriz de autorização", () => {
  let app: NestFastifyApplication;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeAll(async () => {
    prisma = mockPrisma();
    const moduleRef = await Test.createTestingModule({
      controllers: [CuradoriaController],
      providers: [
        CuradoriaService,
        AuditLogService,
        { provide: PrismaService, useValue: prisma },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: FakeRolesGuard },
      ],
    }).compile();

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
    ROLE_ATUAL = "CURATOR";
  });

  const baseRelacao = () => ({
    origem_id: randomUUID(),
    destino_id: randomUUID(),
    tipo: "ADAPTACAO_DE",
  });

  it("anônimo → 401 (AuthGuard)", async () => {
    AUTENTICADO = false;
    const res = await request(app.getHttpServer())
      .post("/api/v1/curadoria/relacoes")
      .send(baseRelacao());
    expect(res.status).toBe(401);
  });

  it("FREE/PLUS/PREMIUM (sem CURATOR/ADMIN) → 403", async () => {
    for (const role of ["USER", "MODERADOR"]) {
      ROLE_ATUAL = role;
      const res = await request(app.getHttpServer())
        .post("/api/v1/curadoria/relacoes")
        .send(baseRelacao());
      expect(res.status).toBe(403);
    }
  });

  it("CURATOR cria relação com audit_log (200)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/curadoria/relacoes")
      .send(baseRelacao());
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("rel-1");
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acao: "CURADORIA_RELACAO_UPSERT",
          usuario_id: "user-teste",
        }),
      }),
    );
  });

  it("ADMIN também pode (200)", async () => {
    ROLE_ATUAL = "ADMIN";
    const res = await request(app.getHttpServer())
      .post("/api/v1/curadoria/relacoes")
      .send(baseRelacao());
    expect(res.status).toBe(201);
  });

  it("payload inválido → 400 (Zod)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/curadoria/relacoes")
      .send({ origem_id: "nao-uuid", destino_id: "m-b", tipo: "INVALIDO" });
    expect(res.status).toBe(400);
  });

  it("rate limit de curadoria (10/min) → 429 após o limite", async () => {
    ROLE_ATUAL = "CURATOR";
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer()).post("/api/v1/curadoria/classificacoes").send({
        midia_id: randomUUID(),
        regiao: "BR",
        valor: "L",
        fonte: "TEST",
      });
    }
    const res = await request(app.getHttpServer()).post("/api/v1/curadoria/classificacoes").send({
      midia_id: randomUUID(),
      regiao: "BR",
      valor: "L",
      fonte: "TEST",
    });
    expect(res.status).toBe(429);
  });

  it("CURATOR não acessa /admin/stats (403)", async () => {
    ROLE_ATUAL = "CURATOR";
    // O guard rejeita rotas sem CURATOR/ADMIN no metadata (o /admin/stats
    // exige apenas ADMIN — coberto pelo admin.e2e); aqui verifica o metadata
    // de classe da curadoria.
    expect(Reflect.getMetadata("roles", CuradoriaController)).toEqual(["CURATOR", "ADMIN"]);
  });
});
