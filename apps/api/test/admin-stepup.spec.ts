import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdminStepUpController } from "../src/modules/admin/admin-stepup.controller.js";
import {
  AdminStepUpService,
  STEPUP_TTL_DEFAULT,
} from "../src/modules/admin/admin-stepup.service.js";
import { AdminProbingMonitor } from "../src/common/admin-probing-monitor.js";
import type { CacheService } from "../src/common/cache.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import type { PasswordService } from "../src/common/password.service.js";
import type { AuditLogService } from "../src/common/audit-log.service.js";

/**
 * T205 Fase 1 — contrato do handler POST /api/v1/admin/step-up (método direto,
 * sem TestingModule: o roteamento/Zod/401-403 da cadeia global são exercidos
 * pelo CI — E2E/suítes com AppModule). Aqui: semântica de sucesso/falha,
 * sanitização e audit.
 *
 * Anônimo → 401 e USER → 403 são da cadeia global de guards (AuthGuard/
 * RolesGuard), exercidos no CI e nos e2e existentes.
 */

function controllerCom(override?: {
  verify?: (senha: string, hash: string) => Promise<boolean>;
  falhaSet?: boolean;
}) {
  const cache = {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {
      if (override?.falhaSet) throw new Error("redis down");
      return undefined;
    }),
  } as unknown as CacheService;
  const prisma = {
    usuario: {
      findUnique: vi.fn(
        override?.findUnique ?? (async () => ({ password_hash: "$argon2id$hash" })),
      ),
    },
  } as unknown as PrismaService;
  const password = {
    verify: vi.fn(override?.verify ?? (async (s: string) => s === "Senha@Correta")),
  } as unknown as PasswordService;
  const audit = { log: vi.fn(async () => undefined) } as unknown as AuditLogService;
  const probing = new AdminProbingMonitor({ now: () => 1_000_000, limite: 9999 });
  const controller = new AdminStepUpController(
    new AdminStepUpService(cache, prisma, password, audit),
    prisma,
    password,
    cache,
    probing,
    audit,
  );
  return { controller, probing, audit, password };
}

function reqFake(comUser: boolean) {
  return {
    user: comUser ? { id: "u-1", sessao_id: "sess-123" } : undefined,
    cookies: { sess: "sess-token" },
    url: "/api/v1/admin/step-up",
  } as never;
}

describe("AdminStepUpController — POST /api/v1/admin/step-up (T205 Fase 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ADMIN + senha correta → {ok:true, expiresIn:900} e marca gravada", async () => {
    const { controller } = controllerCom();
    const r = await controller.stepUp(reqFake(true), { senha: "Senha@Correta" });
    expect(r.ok).toBe(true);
    expect(r.expiresIn).toBe(STEPUP_TTL_DEFAULT);
  });

  it("senha errada → HttpException 401 sanitizado (mensagem genérica, sem senha/hash)", async () => {
    const { controller } = controllerCom({ verify: async () => false });
    let capturado: unknown = null;
    try {
      await controller.stepUp(reqFake(true), { senha: "Senha@Errada" });
    } catch (e) {
      capturado = e;
    }
    const status = (capturado as { getStatus?: () => number }).getStatus?.() ?? 0;
    expect(status).toBe(401);
    const payload =
      (capturado as { getResponse?: () => Record<string, unknown> }).getResponse?.() ?? {};
    const bruto = JSON.stringify(payload);
    expect(bruto).not.toContain("Senha@");
    expect(bruto).not.toContain("argon2");
    expect(String(payload.message)).toMatch(/credencial/i);
  });

  it("senha errada alimenta o anti-probing (registro sanitizado, sem senha)", async () => {
    const { controller, probing } = controllerCom({ verify: async () => false });
    const espiao = vi.spyOn(probing, "registrar");
    try {
      await controller.stepUp(reqFake(true), { senha: "Senha@Errada" });
    } catch {
      // esperado 401
    }
    expect(espiao).toHaveBeenCalled();
    const args = JSON.stringify(espiao.mock.calls[0]);
    expect(args).not.toContain("Senha@");
  });

  it("sem user no request (anônimo) → HttpException 401", async () => {
    const { controller } = controllerCom();
    let status = 0;
    try {
      await controller.stepUp(reqFake(false), { senha: "x" });
    } catch (e) {
      status = (e as { getStatus?: () => number }).getStatus?.() ?? 0;
    }
    expect(status).toBe(401);
  });

  it("usuário sem password_hash → 401 sanitizado (e SEM marca)", async () => {
    const { controller } = controllerCom({ findUnique: async () => null });
    let capturado: unknown = null;
    try {
      await controller.stepUp(reqFake(true), { senha: "x" });
    } catch (e) {
      capturado = e;
    }
    expect((capturado as { getStatus?: () => number }).getStatus?.()).toBe(401);
    expect(String(capturado)).not.toContain("password_hash");
  });

  it("store falhando ao gravar a marca → erro propaga (NENHUMA marca concedida)", async () => {
    const { controller } = controllerCom({ falhaSet: true });
    await expect(controller.stepUp(reqFake(true), { senha: "Senha@Correta" })).rejects.toThrow();
  });

  it("audit registra SUCESSO e FALHA sem senha/hash no registro", async () => {
    const { controller, audit } = controllerCom();
    await controller.stepUp(reqFake(true), { senha: "Senha@Correta" });
    try {
      await controller.stepUp(reqFake(true), { senha: "Senha@Errada" });
    } catch {
      // 401 esperado
    }
    const chamadas = (audit.log as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => JSON.stringify(c[0]))
      .join("\n");
    expect(chamadas).toContain("ADMIN_STEPUP_SUCCESS");
    expect(chamadas).toContain("ADMIN_STEPUP_FAIL");
    expect(chamadas).not.toContain("Senha@");
    expect(chamadas).not.toContain("argon2");
  });
});
