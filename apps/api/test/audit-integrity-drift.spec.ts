import { describe, it, expect, vi, afterEach } from "vitest";
import { AuditLogService } from "../src/common/audit-log.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

/**
 * T057 — caracterização do drift de timestamp na cadeia de hash do AuditLog.
 *
 * `log()` calcula `hash_cadeia` com `new Date().toISOString()` (relógio do APP,
 * antes do INSERT). `verificarIntegridade()` recalcula com
 * `created_at.toISOString()` (relógio do BANCO, `@default(now())`). Se os dois
 * instantes divergirem (clock skew + latência), a verificação acusa violação
 * FALSA-POSITIVA — mesmo sem qualquer adulteração.
 *
 * Teste DETERMINÍSTICO via mock (não usa banco de produção nem Docker).
 */
const NOW = new Date("2026-09-24T12:00:00.000Z");

function prismaComOffset(offsetMs: number) {
  const rows: Record<string, unknown>[] = [];
  const prisma = {
    auditLog: {
      findFirst: async () => (rows.length > 0 ? rows[rows.length - 1] : null),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        // Simula o `@default(now())`: instante do INSERT no banco.
        const row = { ...data, id: "id-1", created_at: new Date(NOW.getTime() + offsetMs) };
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
    dadosDepois: { ok: true },
  });
  return svc;
}

describe("T057 — drift de timestamp em verificarIntegridade", () => {
  afterEach(() => vi.useRealTimers());

  it("SEM drift (created_at == instante do hash) → cadeia íntegra", async () => {
    vi.useFakeTimers({ now: NOW });
    const { prisma } = prismaComOffset(0);
    const svc = await registrar(prisma);
    expect(await svc.verificarIntegridade()).toEqual({ integro: true, violacoes: 0 });
  });

  it("COM drift de poucos ms (created_at +2ms) → FALSO-POSITIVO", async () => {
    vi.useFakeTimers({ now: NOW });
    const { prisma } = prismaComOffset(2);
    const svc = await registrar(prisma);
    expect(await svc.verificarIntegridade()).toEqual({ integro: false, violacoes: 1 });
  });

  it("COM clock skew grande (app/bank -3s) → FALSO-POSITIVO", async () => {
    vi.useFakeTimers({ now: NOW });
    const { prisma } = prismaComOffset(-3000);
    const svc = await registrar(prisma);
    const r = await svc.verificarIntegridade();
    expect(r.integro).toBe(false);
    expect(r.violacoes).toBeGreaterThan(0);
  });

  it("hash NÃO depende de dados_antes/dados_depois/ip_origem (T055)", async () => {
    vi.useFakeTimers({ now: NOW });
    const { prisma, rows } = prismaComOffset(0);
    const svc = await registrar(prisma);
    // Alterar apenas o payload (fora do hash) não muda a verificação.
    (rows[0] as Record<string, unknown>).dados_depois = { alterado: true };
    expect(await svc.verificarIntegridade()).toEqual({ integro: true, violacoes: 0 });
  });
});
