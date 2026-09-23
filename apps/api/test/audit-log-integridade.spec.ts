import { describe, it, expect, vi } from "vitest";
import { AuditLogService } from "../src/common/audit-log.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

/**
 * T055 — a cadeia de hash continua válida com o payload sanitizado (D-545).
 * O hash NÃO depende de dados_antes/dados_depois/ip_origem, então a sanitização
 * não invalida a trilha. Registros históricos não são alterados.
 */
const EMAIL_FIXTURE = "usuario@example.invalid";
const IP_FIXTURE = "203.0.113.45";

function buildPrisma() {
  const rows: Record<string, unknown>[] = [];
  let seq = 0;
  const prisma = {
    auditLog: {
      findFirst: async () => (rows.length > 0 ? rows[rows.length - 1] : null),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        // Espelha o banco: usa o `created_at` enviado pelo service (T058) ou,
        // se ausente, o `@default(now())`.
        const row = { ...data, id: `id-${seq}`, created_at: data.created_at ?? new Date() };
        seq++;
        rows.push(row);
        return row;
      },
      findMany: async () => rows,
    },
  } as unknown as PrismaService;
  return { prisma, rows };
}

describe("T055 — integridade da cadeia com payload sanitizado", () => {
  it("hash segue íntegro e os registros não são alterados", async () => {
    vi.useFakeTimers({ now: new Date("2026-09-23T12:00:00.000Z") });
    try {
      const { prisma, rows } = buildPrisma();
      const svc = new AuditLogService(prisma);

      await svc.log({
        entidade: "usuario",
        entidadeId: "u-1",
        acao: "REGISTER",
        usuarioId: "u-1",
        dadosDepois: { email: EMAIL_FIXTURE },
        ipOrigem: IP_FIXTURE,
      });
      await svc.log({
        entidade: "usuario",
        entidadeId: "u-1",
        acao: "LOGIN_SUCCESS",
        usuarioId: "u-1",
        dadosDepois: { ip: IP_FIXTURE, user_agent: "UA/1.0" },
      });

      const snapshot = JSON.stringify(rows);
      expect(snapshot).not.toContain(EMAIL_FIXTURE);
      expect(snapshot).not.toContain(IP_FIXTURE);

      const r = await svc.verificarIntegridade();
      expect(r).toEqual({ integro: true, violacoes: 0 });

      // verificarIntegridade não altera as linhas (append-only preservado).
      expect(JSON.stringify(rows)).toBe(snapshot);
    } finally {
      vi.useRealTimers();
    }
  });
});
