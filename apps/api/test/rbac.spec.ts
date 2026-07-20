/* eslint-disable @typescript-eslint/no-extraneous-class, @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../src/common/guards/roles.guard.js";
import type { ExecutionContext } from "@nestjs/common";
import type { PrismaService } from "../src/prisma/prisma.service.js";

function createMockPrisma(): {
  prisma: PrismaService;
  usuarioPapel: { findMany: ReturnType<typeof vi.fn> };
} {
  const usuarioPapel = { findMany: vi.fn() };
  const prisma = { usuarioPapel } as unknown as PrismaService;
  return { prisma, usuarioPapel };
}

class EmptyClass {}

function createExecutionContext(
  user: { id: string } | undefined,
  requiredRoles: string[] | undefined,
): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => EmptyClass,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard (T3.4/T3.5)", () => {
  let guard: RolesGuard;
  let mock: ReturnType<typeof createMockPrisma>;
  let reflector: Reflector;

  beforeEach(() => {
    mock = createMockPrisma();
    reflector = new Reflector();
    guard = new RolesGuard(reflector, mock.prisma);
  });

  it("permite passar se rota nao tem @Roles() (sem metadata)", async () => {
    // Mock getAllAndOverride para retornar undefined
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const ctx = createExecutionContext({ id: "u1" }, undefined);
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(mock.usuarioPapel.findMany).not.toHaveBeenCalled();
  });

  it("permite passar se usuario tem papel exigido", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["ADMIN"]);
    mock.usuarioPapel.findMany.mockResolvedValue([
      { papel: { nome: "USER" } },
      { papel: { nome: "ADMIN" } },
    ]);
    const ctx = createExecutionContext({ id: "u1" }, ["ADMIN"]);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("bloqueia (403) se usuario nao tem papel exigido", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["ADMIN"]);
    mock.usuarioPapel.findMany.mockResolvedValue([{ papel: { nome: "USER" } }]);
    const ctx = createExecutionContext({ id: "u1" }, ["ADMIN"]);
    await expect(guard.canActivate(ctx)).rejects.toThrow(/permissão/);
  });

  it("aceita multiplos papeis (OR logico)", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["ADMIN", "MODERADOR"]);
    mock.usuarioPapel.findMany.mockResolvedValue([{ papel: { nome: "MODERADOR" } }]);
    const ctx = createExecutionContext({ id: "u1" }, ["ADMIN", "MODERADOR"]);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("permite passar se user ausente (rota pública ou test sem auth)", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["ADMIN"]);
    const ctx = createExecutionContext(undefined, ["ADMIN"]);
    // Sem user = AuthGuard permitiu passar (rota pública). RolesGuard
    // não aplica verificação de papel.
    expect(await guard.canActivate(ctx)).toBe(true);
  });
});
