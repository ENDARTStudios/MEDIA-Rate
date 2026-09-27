/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import { Controller, Get, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { Roles } from "../src/common/decorators/roles.decorator.js";
import { RequirePlan } from "../src/common/decorators/require-plan.decorator.js";
import { RolesGuard } from "../src/common/guards/roles.guard.js";
import { PlanGuard } from "../src/common/guards/plan.guard.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { RegisterDto } from "../src/modules/auth/dto/auth.dto.js";

/**
 * BETA-GAP-03 / T119 — RBAC mínimo para administrador técnico.
 *
 * Prova, com os guards REAIS (RolesGuard + PlanGuard), que:
 * - o acesso admin depende de PAPEL, nunca de plano (FREE+ADMIN acessa;
 *   PREMIUM sem ADMIN é negado com 403);
 * - a rota admin não impõe plano (PlanGuard sem @RequirePlan = liberado);
 * - o gating de plano continua separado (402) e independente de papel;
 * - o payload público de registro NÃO permite autopromoção (Zod descarta
 *   `role`/`papeis`; o service cria apenas USER).
 *
 * O 401 de anônimo é coberto por `auth-guard.spec.ts` (rota /admin/stats).
 */

// Estado mutável dos "usuários" fictícios — sem credencial real.
const USERS: Record<string, { roles: string[]; plan: string }> = {
  "free-admin": { roles: ["USER", "ADMIN"], plan: "FREE" },
  "premium-admin": { roles: ["USER", "ADMIN"], plan: "PREMIUM" },
  "premium": { roles: ["USER"], plan: "PREMIUM" },
  "common": { roles: ["USER"], plan: "FREE" },
};

const prismaMock = {
  usuarioPapel: {
    findMany: vi.fn(async ({ where }: any) =>
      (USERS[where.usuario_id]?.roles ?? []).map((nome) => ({ papel: { nome } })),
    ),
  },
  usuarioPlano: {
    findUnique: vi.fn(async ({ where }: any) => ({
      plano: USERS[where.usuario_id]?.plan ?? "FREE",
      status: "ATIVA",
    })),
  },
  // comContextoRls (usado pelo PlanGuard) sem $transaction real.
  $transaction: async (fn: (tx: any) => Promise<unknown>) => fn(prismaMock),
  $executeRawUnsafe: async () => undefined,
};

/** Auth fake: injeta o usuário do header `x-test-user` (isola o RBAC). */
class FakeAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest() as {
      headers: Record<string, string | undefined>;
      user?: { id: string };
    };
    const id = req.headers["x-test-user"];
    if (id) req.user = { id };
    return true; // sem id = anônimo (AuthGuard real cobre 401)
  }
}

@Controller("api/v1/test-admin")
class TestAdminController {
  @Get("admin-only")
  @Roles("ADMIN")
  adminOnly() {
    return { ok: true, scope: "admin" };
  }

  @Get("premium-only")
  @RequirePlan("PREMIUM")
  premiumOnly() {
    return { ok: true, scope: "premium" };
  }
}

describe("BETA-GAP-03 — RBAC admin independe de plano (guards reais)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestAdminController],
      providers: [
        { provide: PrismaService, useValue: prismaMock },
        // Mesma ordem do AppModule: Auth → Roles → Plan.
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: PlanGuard },
      ],
    }).compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const get = (path: string, userId?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return userId ? req.set("x-test-user", userId) : req;
  };

  it("FREE com papel ADMIN acessa rota admin (acesso não depende de plano)", async () => {
    const res = await get("/api/v1/test-admin/admin-only", "free-admin");
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe("admin");
  });

  it("PREMIUM com papel ADMIN também acessa (plano não restringe admin)", async () => {
    const res = await get("/api/v1/test-admin/admin-only", "premium-admin");
    expect(res.status).toBe(200);
  });

  it("PREMIUM SEM papel ADMIN é negado (403) — plano pago não concede admin", async () => {
    const res = await get("/api/v1/test-admin/admin-only", "premium");
    expect(res.status).toBe(403);
  });

  it("usuário comum é negado (403) na rota admin", async () => {
    const res = await get("/api/v1/test-admin/admin-only", "common");
    expect(res.status).toBe(403);
  });

  it("gating de plano continua separado: FREE sem @RequirePlan? não; em premium-only → 402", async () => {
    const livre = await get("/api/v1/test-admin/premium-only", "common");
    expect(livre.status).toBe(402); // FREE < PREMIUM
    const pago = await get("/api/v1/test-admin/premium-only", "premium");
    expect(pago.status).toBe(200); // PREMIUM acessa
    const adminFree = await get("/api/v1/test-admin/premium-only", "free-admin");
    expect(adminFree.status).toBe(402); // admin NÃO furou o gating de plano
  });

  it("registro público não permite autopromoção (Zod descarta role/papeis)", () => {
    const parsed = RegisterDto.parse({
      email: "novo@example.test",
      password: "SenhaForte123",
      aceitouTermos: true,
      role: "ADMIN",
      papeis: ["ADMIN"],
    });
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("papeis");
    // Campos esperados preservados.
    expect(parsed.email).toBe("novo@example.test");
  });
});
