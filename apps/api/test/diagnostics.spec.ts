import { describe, it, expect, vi } from "vitest";
import { DiagnosticsService } from "../src/modules/diagnostics/diagnostics.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import type { FeatureFlagService } from "../src/modules/flags/feature-flags.service.js";

function buildMockPrisma() {
  return {
    $queryRawUnsafe: vi.fn(async () => [{ "?column?": 1 }]),
    midia: { count: vi.fn(async () => 400) },
    usuario: { count: vi.fn(async () => 1200) },
  };
}

function buildMockFlags() {
  return {
    listar: vi.fn(async () => [
      {
        key: "discovery-feed-v1",
        enabled: true,
        rollout_percent: 100,
        plan_gate: null,
        tenant_overrides: {},
        updated_by: "admin-1",
      },
      {
        key: "admin-sentry-test",
        enabled: false,
        rollout_percent: 0,
        plan_gate: null,
        tenant_overrides: { "00000000-0000-0000-0000-000000000001": true },
        updated_by: "admin-1",
      },
    ]),
  };
}

describe("DiagnosticsService (T329)", () => {
  it("retorna estado operacional + contagens sem PII/secrets", async () => {
    const prisma = buildMockPrisma();
    const flags = buildMockFlags();
    const service = new DiagnosticsService(
      prisma as unknown as PrismaService,
      flags as unknown as FeatureFlagService,
    );

    const r = await service.diagnosticar();

    expect(r.server.node_env).toBeDefined();
    expect(r.server.uptime_segundos).toBeGreaterThanOrEqual(0);
    expect(r.server.versao).toBeDefined();
    expect(r.database.ok).toBe(true);
    expect(r.database.latencia_ms).toBeGreaterThanOrEqual(0);
    expect(r.contagens).toEqual({ midias: 400, usuarios: 1200 });
    expect(r.feature_flags).toEqual([
      { key: "discovery-feed-v1", enabled: true, rollout_percent: 100 },
      { key: "admin-sentry-test", enabled: false, rollout_percent: 0 },
    ]);

    // Redaction: campos internos (updated_by/tenant_overrides) NÃO vazam.
    const json = JSON.stringify(r);
    expect(json).not.toContain("updated_by");
    expect(json).not.toContain("tenant_overrides");
    expect(json).not.toContain("admin-1");
  });

  it("db check false (sem latência) quando SELECT 1 falha", async () => {
    const prisma = {
      ...buildMockPrisma(),
      $queryRawUnsafe: vi.fn(async () => {
        throw new Error("banco indisponível");
      }),
    };
    const service = new DiagnosticsService(
      prisma as unknown as PrismaService,
      buildMockFlags() as unknown as FeatureFlagService,
    );

    const r = await service.diagnosticar();

    expect(r.database.ok).toBe(false);
    expect(r.database.latencia_ms).toBeNull();
    // Contagens continuam resolvendo (falha de DB check não derruba o painel).
    expect(r.contagens).toEqual({ midias: 400, usuarios: 1200 });
  });
});
