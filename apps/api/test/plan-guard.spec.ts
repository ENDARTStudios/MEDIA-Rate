/* eslint-disable @typescript-eslint/no-extraneous-class */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import { PlanGuard } from "../src/common/guards/plan.guard.js";
import type { ExecutionContext } from "@nestjs/common";
import type { PrismaService } from "../src/prisma/prisma.service.js";

function createMockPrisma(): {
  prisma: PrismaService;
  usuarioPlano: { findUnique: ReturnType<typeof vi.fn> };
} {
  const usuarioPlano = { findUnique: vi.fn() };
  const prisma = { usuarioPlano } as unknown as PrismaService;
  return { prisma, usuarioPlano };
}

class EmptyClass {}

function createExecutionContext(
  user: { id: string } | undefined,
  _requiredPlan: string | undefined,
): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => EmptyClass,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe("PlanGuard (T3.7)", () => {
  let guard: PlanGuard;
  let mock: ReturnType<typeof createMockPrisma>;
  let reflector: Reflector;

  beforeEach(() => {
    mock = createMockPrisma();
    reflector = new Reflector();
    guard = new PlanGuard(reflector, mock.prisma);
  });

  it("permite passar se rota nao tem @RequirePlan()", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const ctx = createExecutionContext({ id: "u1" }, undefined);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("permite FREE acessar rota sem @RequirePlan (sem requisito)", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const ctx = createExecutionContext({ id: "u1" }, undefined);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("bloqueia FREE em rota @RequirePlan('PLUS') — retorna 402", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue("PLUS");
    mock.usuarioPlano.findUnique.mockResolvedValue({ plano: "FREE", status: "ATIVA" });
    const ctx = createExecutionContext({ id: "u1" }, "PLUS");
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: {
        statusCode: 402,
        error: "Payment Required",
        current_plan: "FREE",
        required_plan: "PLUS",
      },
    });
  });

  it("permite PLUS em rota @RequirePlan('PLUS')", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue("PLUS");
    mock.usuarioPlano.findUnique.mockResolvedValue({ plano: "PLUS", status: "ATIVA" });
    const ctx = createExecutionContext({ id: "u1" }, "PLUS");
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("permite PREMIUM em rota @RequirePlan('PLUS') (hierarquia)", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue("PLUS");
    mock.usuarioPlano.findUnique.mockResolvedValue({ plano: "PREMIUM", status: "ATIVA" });
    const ctx = createExecutionContext({ id: "u1" }, "PLUS");
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("bloqueia PLUS em rota @RequirePlan('PREMIUM') — retorna 402", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue("PREMIUM");
    mock.usuarioPlano.findUnique.mockResolvedValue({ plano: "PLUS", status: "ATIVA" });
    const ctx = createExecutionContext({ id: "u1" }, "PREMIUM");
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: {
        statusCode: 402,
        current_plan: "PLUS",
        required_plan: "PREMIUM",
      },
    });
  });

  it("permite PREMIUM em rota @RequirePlan('PREMIUM')", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue("PREMIUM");
    mock.usuarioPlano.findUnique.mockResolvedValue({ plano: "PREMIUM", status: "ATIVA" });
    const ctx = createExecutionContext({ id: "u1" }, "PREMIUM");
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("default FREE se usuario sem registro em usuario_plano", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue("PLUS");
    mock.usuarioPlano.findUnique.mockResolvedValue(null);
    const ctx = createExecutionContext({ id: "u1" }, "PLUS");
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: { current_plan: "FREE" },
    });
  });

  it("cache 60s: segunda chamada nao consulta banco", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue("PLUS");
    mock.usuarioPlano.findUnique.mockResolvedValue({ plano: "PLUS", status: "ATIVA" });
    const ctx1 = createExecutionContext({ id: "u1" }, "PLUS");
    expect(await guard.canActivate(ctx1)).toBe(true);
    const ctx2 = createExecutionContext({ id: "u1" }, "PLUS");
    expect(await guard.canActivate(ctx2)).toBe(true);
    // Apenas 1 chamada ao banco (segunda usou cache).
    expect(mock.usuarioPlano.findUnique).toHaveBeenCalledOnce();
  });

  it("invalidateCache() força próxima chamada a consultar banco", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue("PLUS");
    mock.usuarioPlano.findUnique.mockResolvedValue({ plano: "PLUS", status: "ATIVA" });
    const ctx1 = createExecutionContext({ id: "u1" }, "PLUS");
    await guard.canActivate(ctx1);
    guard.invalidateCache("u1");
    const ctx2 = createExecutionContext({ id: "u1" }, "PLUS");
    await guard.canActivate(ctx2);
    expect(mock.usuarioPlano.findUnique).toHaveBeenCalledTimes(2);
  });
});
