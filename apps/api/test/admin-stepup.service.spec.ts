import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AdminStepUpService,
  STEPUP_TTL_DEFAULT,
} from "../src/modules/admin/admin-stepup.service.js";
import type { CacheService } from "../src/common/cache.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import type { PasswordService } from "../src/common/password.service.js";
import type { AuditLogService } from "../src/common/audit-log.service.js";

/**
 * T205 Fase 1 — serviço de step-up: busca o hash do usuário (read-only),
 * verifica com PasswordService (argon2id+pepper, existente), grava marca TTL
 * no store compartilhado (CacheService) e audita SUCCESS/FAIL de forma
 * sanitizada. Fail-closed: falha de store = sem marca = nunca permite.
 */

function fakes(
  sobrescreve: {
    findUnique?: (args: unknown) => Promise<unknown>;
    verify?: (senha: string, hash: string) => Promise<boolean>;
    log?: (params: Record<string, unknown>) => Promise<void>;
    falhaSet?: boolean;
    falhaGet?: boolean;
  } = {},
) {
  const mapa = new Map<string, unknown>();
  const cache = {
    get: vi.fn(async (k: string) => {
      if (sobrescreve.falhaGet) throw new Error("redis down");
      return (mapa.get(k) as number) ?? null;
    }),
    set: vi.fn(async (k: string, v: unknown, ttl: number) => {
      if (sobrescreve.falhaSet) throw new Error("redis down");
      mapa.set(k, v);
      void ttl;
    }),
  } as unknown as CacheService;
  const prisma = {
    usuario: {
      findUnique: vi.fn(sobrescreve.findUnique ?? (async () => ({ password_hash: "h1" }))),
    },
  } as unknown as PrismaService;
  const password = {
    verify: vi.fn(sobrescreve.verify ?? (async () => true)),
  } as unknown as PasswordService;
  const audit = {
    log: vi.fn(sobrescreve.log ?? (async () => undefined)),
  } as unknown as AuditLogService;
  const svc = new AdminStepUpService(cache, prisma, password, audit);
  return { svc, cache, prisma, password, audit };
}

describe("AdminStepUpService (T205 Fase 1)", () => {
  beforeEach(() => {
    delete process.env.ADMIN_STEPUP_TTL_SECONDS;
  });

  it("stepUp sucesso: senha confere → marca TTL 900 (default), audit SUCCESS, {ok:true,ttl}", async () => {
    const { svc, cache, audit } = fakes({});
    const r = await svc.stepUp("u-1", "sess-1", "Senha@Correta");
    expect(r.ok).toBe(true);
    expect(r.ttl).toBe(STEPUP_TTL_DEFAULT);
    expect(r.ttl).toBe(900);
    const setCall = (cache.set as ReturnType<typeof vi.fn>).mock.calls[0] as unknown as [
      string,
      number,
      number,
    ];
    expect(setCall[2]).toBe(900);
    const auditCall = JSON.stringify((audit.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(auditCall).toContain("ADMIN_STEPUP_SUCCESS");
  });

  it("stepUp honra ADMIN_STEPUP_TTL_SECONDS", async () => {
    process.env.ADMIN_STEPUP_TTL_SECONDS = "300";
    const { svc } = fakes({});
    const r = await svc.stepUp("u-1", "sess-1", "Senha@Correta");
    expect(r.ttl).toBe(300);
  });

  it("senha errada → {ok:false}, audit FAIL, SEM marca", async () => {
    const { svc, cache, audit } = fakes({ verify: async () => false });
    const r = await svc.stepUp("u-1", "sess-1", "Errada");
    expect(r.ok).toBe(false);
    expect(cache.set).not.toHaveBeenCalled();
    const auditCall = JSON.stringify((audit.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(auditCall).toContain("ADMIN_STEPUP_FAIL");
  });

  it("usuário sem password_hash (conta sem senha) → {ok:false} + audit FAIL", async () => {
    const { svc, audit } = fakes({ findUnique: async () => null });
    const r = await svc.stepUp("u-1", "sess-1", "qualquer");
    expect(r.ok).toBe(false);
    const auditCall = JSON.stringify((audit.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(auditCall).toContain("ADMIN_STEPUP_FAIL");
  });

  it("temMarca true após stepUp; false antes; chave NUNCA contém sessão crua", async () => {
    const { svc, cache } = fakes({});
    expect(await svc.temMarca("sess-9")).toBe(false);
    await svc.stepUp("u-1", "sess-9", "Senha@Correta");
    expect(await svc.temMarca("sess-9")).toBe(true);
    const setCall = (cache.set as ReturnType<typeof vi.fn>).mock.calls[0] as unknown as [string];
    expect(setCall[0]).not.toContain("sess-9");
    expect(setCall[0]).toMatch(/^admin:stepup:[0-9a-f]{32}$/);
  });

  it("FAIL-CLOSED: store lançando em get → temMarca false (nunca permite)", async () => {
    const { svc } = fakes({ falhaGet: true });
    expect(await svc.temMarca("s1")).toBe(false);
  });

  it("FAIL-CLOSED: store lançando em set → stepUp propaga erro (controller sanitiza; marca NÃO é concedida)", async () => {
    const { svc, audit } = fakes({ falhaSet: true });
    await expect(svc.stepUp("u-1", "sess-1", "Senha@Correta")).rejects.toThrow();
    const chamadas = JSON.stringify((audit.log as ReturnType<typeof vi.fn>).mock.calls);
    expect(chamadas).not.toContain("ADMIN_STEPUP_SUCCESS");
  });

  it("audit NUNCA contém a senha informada", async () => {
    const { svc, audit } = fakes({ verify: async () => false });
    await svc.stepUp("u-1", "sess-1", "MinhaSenhaSecreta");
    const chamadas = JSON.stringify((audit.log as ReturnType<typeof vi.fn>).mock.calls);
    expect(chamadas).not.toContain("MinhaSenhaSecreta");
  });
});
