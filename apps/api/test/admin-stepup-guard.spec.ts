import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdminStepUpGuard } from "../src/modules/admin/admin-stepup.guard.js";
import type { AdminStepUpService } from "../src/modules/admin/admin-stepup.service.js";
import type { ExecutionContext } from "@nestjs/common";

/**
 * T205 Fase 1 — guarda de step-up aplicada à CLASSE dos controllers admin
 * (Admin/FeatureFlags/AssetUpload). Contrato:
 * - GET/HEAD/OPTIONS e o próprio /step-up → liberados (o guard filtra por método);
 * - mutante sem marca válida → HttpException 428 com code ADMIN_STEPUP_REQUIRED;
 * - marca válida → true;
 * - env ADMIN_STEPUP_REQUIRED=0 → desligado (kill-switch de rollback);
 * - store falhando → fail-closed (428);
 * - sem sessão/sem user → fail-closed.
 */

function contextoFake(parcial: { method?: string; url?: string; sessaoId?: string | null }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: parcial.method ?? "POST",
        url: parcial.url ?? "/api/v1/admin/lgpd/purge",
        cookies: { sess: "sess-token" },
        user:
          parcial.sessaoId === null
            ? undefined
            : { id: "u1", sessao_id: parcial.sessaoId ?? "sess-1" },
      }),
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe("AdminStepUpGuard (T205 Fase 1)", () => {
  let svc: { temMarca: ReturnType<typeof vi.fn> };
  let guard: AdminStepUpGuard;

  beforeEach(() => {
    delete process.env.ADMIN_STEPUP_REQUIRED;
    svc = { temMarca: vi.fn(async () => true) };
    guard = new AdminStepUpGuard(svc as unknown as AdminStepUpService);
  });

  it("GET → liberado (não-mutante), sem consultar marca", async () => {
    const r = await guard.canActivate(contextoFake({ method: "GET" }));
    expect(r).toBe(true);
    expect(svc.temMarca).not.toHaveBeenCalled();
  });

  it("POST /admin/step-up → liberado (o próprio endpoint não exige marca)", async () => {
    const r = await guard.canActivate(
      contextoFake({ method: "POST", url: "/api/v1/admin/step-up" }),
    );
    expect(r).toBe(true);
    expect(svc.temMarca).not.toHaveBeenCalled();
  });

  it("mutante SEM marca → HttpException 428 com code ADMIN_STEPUP_REQUIRED", async () => {
    svc.temMarca = vi.fn(async () => false);
    let capturado: unknown = null;
    try {
      await guard.canActivate(contextoFake({ method: "POST" }));
    } catch (e) {
      capturado = e;
    }
    const corpo =
      (capturado as { getStatus?: () => number; getResponse?: () => Record<string, unknown> }) ??
      {};
    expect((corpo as { getStatus?: () => number }).getStatus?.()).toBe(428);
    const payload =
      (corpo as { getResponse?: () => Record<string, unknown> }).getResponse?.() ?? {};
    expect(payload.code).toBe("ADMIN_STEPUP_REQUIRED");
    expect(String(payload.message)).not.toMatch(/store|redis|chave/i);
  });

  it("mutante COM marca válida → true", async () => {
    expect(await guard.canActivate(contextoFake({ method: "DELETE" }))).toBe(true);
  });

  it("marca expirada (service retorna false) → 428", async () => {
    svc.temMarca = vi.fn(async () => false);
    let status = 0;
    try {
      await guard.canActivate(contextoFake({ method: "PATCH" }));
    } catch (e) {
      status = (e as { getStatus?: () => number }).getStatus?.() ?? 0;
    }
    expect(status).toBe(428);
  });

  it("FAIL-CLOSED: store lançando → 428 (nunca permite)", async () => {
    svc.temMarca = vi.fn(async () => {
      throw new Error("redis down");
    });
    let status = 200;
    try {
      await guard.canActivate(contextoFake({ method: "POST" }));
    } catch (e) {
      status = (e as { getStatus?: () => number }).getStatus?.() ?? 200;
    }
    expect(status).toBe(428);
  });

  it("sem user/sessão no request → fail-closed (428)", async () => {
    svc.temMarca = vi.fn(async () => true);
    let status = 200;
    try {
      await guard.canActivate(contextoFake({ method: "POST", sessaoId: null }));
    } catch (e) {
      status = (e as { getStatus?: () => number }).getStatus?.() ?? 200;
    }
    expect(status).toBe(428);
    expect(svc.temMarca).not.toHaveBeenCalled();
  });

  it("kill-switch: ADMIN_STEPUP_REQUIRED=0 desliga (rollback sem deploy de código)", async () => {
    process.env.ADMIN_STEPUP_REQUIRED = "0";
    svc.temMarca = vi.fn(async () => false);
    const r = (await guard.canActivate(contextoFake({ method: "POST" }))) as unknown as boolean;
    expect(r).toBe(true);
    expect(svc.temMarca).not.toHaveBeenCalled();
  });
});
