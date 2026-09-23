import { describe, it, expect, vi, afterEach } from "vitest";
import { AuditLogService } from "../src/common/audit-log.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

/**
 * T058 — correção do drift de timestamp (Opção B do relatório T057/D-546).
 *
 * `log()` passa a capturar UM único `new Date()` e a usá-lo tanto no
 * `hash_cadeia` quanto no `created_at` do INSERT → o `verificarIntegridade()`
 * deixa de depender do relógio do banco (sem falso-positivo por skew/latência),
 * mantendo a detecção de adulteração real de conteúdo.
 *
 * Mock determinístico (sem banco real/Docker). Fixtures sintéticas.
 */
const NOW = new Date("2026-09-24T12:00:00.000Z");

/** Simula um banco com relógio DESLOCADO (skew) — só usado se o service não enviar created_at. */
function prismaComSkew(skewMs: number) {
  const rows: Record<string, unknown>[] = [];
  const prisma = {
    auditLog: {
      findFirst: async () => (rows.length > 0 ? rows[rows.length - 1] : null),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          ...data,
          id: `id-${rows.length}`,
          // O banco só aplica o próprio relógio se o service NÃO enviar created_at.
          created_at: data.created_at ?? new Date(NOW.getTime() + skewMs),
        };
        rows.push(row);
        return row;
      },
      findMany: async () => rows,
    },
  } as unknown as PrismaService;
  return { prisma, rows };
}

async function registrar(prisma: PrismaService): Promise<AuditLogService> {
  const svc = new AuditLogService(prisma);
  await svc.log({
    entidade: "usuario",
    entidadeId: "u-1",
    acao: "LOGIN_SUCCESS",
    usuarioId: "u-1",
    dadosDepois: { ok: true, email: "usuario@example.invalid" },
    ipOrigem: "203.0.113.45",
  });
  return svc;
}

describe("T058 — cadeia robusta a drift de relógio", () => {
  afterEach(() => vi.useRealTimers());

  it("novo registro passa em verificarIntegridade imediatamente", async () => {
    vi.useFakeTimers({ now: NOW });
    const { prisma } = prismaComSkew(0);
    const svc = await registrar(prisma);
    expect(await svc.verificarIntegridade()).toEqual({ integro: true, violacoes: 0 });
  });

  it("skew do relógio do banco (+5s) NÃO gera falso-positivo (created_at explícito)", async () => {
    vi.useFakeTimers({ now: NOW });
    const { prisma, rows } = prismaComSkew(5000);
    const svc = await registrar(prisma);
    // o service enviou created_at explícito → o skew do banco não se aplica
    expect((rows[0] as { created_at: Date }).created_at.getTime()).toBe(NOW.getTime());
    expect(await svc.verificarIntegridade()).toEqual({ integro: true, violacoes: 0 });
  });

  it("skew negativo (−3s) também é tolerado", async () => {
    vi.useFakeTimers({ now: NOW });
    const { prisma } = prismaComSkew(-3000);
    const svc = await registrar(prisma);
    expect(await svc.verificarIntegridade()).toEqual({ integro: true, violacoes: 0 });
  });

  it("adulteração real de conteúdo AINDA é detectada (tampering)", async () => {
    vi.useFakeTimers({ now: NOW });
    const { prisma, rows } = prismaComSkew(0);
    const svc = await registrar(prisma);
    (rows[0] as Record<string, unknown>).acao = "ADULTERADO";
    const r = await svc.verificarIntegridade();
    expect(r.integro).toBe(false);
    expect(r.violacoes).toBeGreaterThan(0);
  });

  it("payload sanitizado (dados_depois) fora do hash não afeta a verificação", async () => {
    vi.useFakeTimers({ now: NOW });
    const { prisma, rows } = prismaComSkew(0);
    const svc = await registrar(prisma);
    (rows[0] as Record<string, unknown>).dados_depois = { alterado: true };
    expect(await svc.verificarIntegridade()).toEqual({ integro: true, violacoes: 0 });
  });
});
