/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { FeatureFlagService } from "../src/modules/flags/feature-flags.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { CacheService } from "../src/common/cache.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";

function mockDeps(flags: Record<string, unknown>) {
  const prisma = {
    featureFlag: {
      findUnique: vi.fn(async ({ where }: any) => flags[where.key] ?? null),
      create: vi.fn(async (args: any) => args.data),
      update: vi.fn(async (args: any) => ({ key: args.where.key, ...args.data })),
    },
  };
  const cache = {
    readThrough: vi.fn(async (_k: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
    del: vi.fn(async () => undefined),
  };
  const audit = { log: vi.fn(async () => undefined) };
  return { prisma, cache, audit };
}

describe("FeatureFlagService (T292)", () => {
  let service: FeatureFlagService;

  async function build(flags: Record<string, unknown>) {
    const deps = mockDeps(flags);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: PrismaService, useValue: deps.prisma },
        { provide: CacheService, useValue: deps.cache },
        { provide: AuditLogService, useValue: deps.audit },
      ],
    }).compile();
    service = module.get<FeatureFlagService>(FeatureFlagService);
    return deps;
  }

  it("flag ausente → off (false)", async () => {
    await build({});
    expect(await service.avaliavel("x", { id: "u1" })).toBe(false);
  });

  it("flag desabilitada → false", async () => {
    await build({
      y: { enabled: false, rollout_percent: 100, plan_gate: null, tenant_overrides: null },
    });
    expect(await service.avaliavel("y", { id: "u1" })).toBe(false);
  });

  it("rollout determinístico: mesmo usuário → mesmo resultado em chamadas repetidas", async () => {
    await build({
      r: { enabled: true, rollout_percent: 50, plan_gate: null, tenant_overrides: null },
    });
    const a = await service.avaliavel("r", { id: "u-fixo" });
    const b = await service.avaliavel("r", { id: "u-fixo" });
    expect(a).toBe(b);
  });

  it("planGate: PLUS exigido bloqueia FREE e libera PLUS/PREMIUM", async () => {
    await build({
      p: { enabled: true, rollout_percent: 100, plan_gate: "PLUS", tenant_overrides: null },
    });
    expect(await service.avaliavel("p", { id: "u1", plano: "FREE" })).toBe(false);
    expect(await service.avaliavel("p", { id: "u1", plano: "PLUS" })).toBe(true);
    expect(await service.avaliavel("p", { id: "u1", plano: "PREMIUM" })).toBe(true);
  });

  it("tenantOverride: false desliga a flag para o tenant padrão", async () => {
    await build({
      t: {
        enabled: true,
        rollout_percent: 100,
        plan_gate: null,
        tenant_overrides: { "00000000-0000-0000-0000-000000000001": false },
      },
    });
    expect(await service.avaliavel("t", { id: "u1" })).toBe(false);
  });

  it("CRUD admin: criar e atualizar invalidam cache e gravam audit", async () => {
    const deps = await build({});
    await service.criar("admin-1", { key: "nova", enabled: true });
    expect(deps.prisma.featureFlag.create).toHaveBeenCalled();
    expect(deps.cache.del).toHaveBeenCalledWith("flags:nova");
    expect(deps.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "FLAG_CREATE", usuarioId: "admin-1" }),
    );
  });
});
