/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { SessionRotationService } from "../src/modules/auth/session-rotation.service.js";

/** Store in-memory com a semântica mínima de "sessao". */
function makeStore() {
  const rows = new Map<string, Record<string, unknown>>();
  const prisma = {
    sessao: {
      findUnique: async ({ where }: any) => {
        if (where.token_hash) {
          return [...rows.values()].find((r) => r.token_hash === where.token_hash) ?? null;
        }
        if (where.refresh_token_hash) {
          return (
            [...rows.values()].find((r) => r.refresh_token_hash === where.refresh_token_hash) ??
            null
          );
        }
        return null;
      },
      findFirst: async ({ where }: any) =>
        [...rows.values()].find(
          (r) => r.refresh_token_hash_anterior === where.refresh_token_hash_anterior,
        ) ?? null,
      update: async ({ where, data }: any) => {
        const row = rows.get(where.id) ?? [...rows.values()].find((r) => r.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const r of rows.values()) {
          if (r.usuario_id === where.usuario_id && r.revoked_at === null) {
            Object.assign(r, data);
            count++;
          }
        }
        return { count };
      },
    },
  };
  return { prisma, rows };
}

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

describe("SessionRotationService (T212)", () => {
  let store: ReturnType<typeof makeStore>;
  let service: SessionRotationService;

  beforeEach(() => {
    store = makeStore();
    service = new SessionRotationService(store.prisma as any);
  });

  it("rotação: token atual válido → novo refresh (mesma família) + novo access hash", async () => {
    const refreshAtual = service.generateRefreshToken();
    const familia = randomUUID();
    store.rows.set("s1", {
      id: "s1",
      usuario_id: "u1",
      token_hash: "access-hash-1",
      refresh_token_hash: hash(refreshAtual),
      refresh_token_hash_anterior: null,
      refresh_expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      refresh_family_id: familia,
      revoked_at: null,
    });

    const novoAccessHash = "access-hash-2";
    const r = await service.rotacionarRefresh({
      refreshToken: refreshAtual,
      novoAccessHash,
      accessExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.refreshToken).not.toBe(refreshAtual);
    expect(r.familyId).toBe(familia);
    const row = store.rows.get("s1")!;
    expect(row.refresh_token_hash_anterior).toBe(hash(refreshAtual)); // antigo vira anterior
    expect(row.refresh_token_hash).toBe(hash(r.refreshToken)); // novo hash
    expect(row.token_hash).toBe(novoAccessHash); // access rotacionado junto
  });

  it("refresh expirado → inválido (sem revogar)", async () => {
    const refreshAtual = service.generateRefreshToken();
    store.rows.set("s1", {
      id: "s1",
      usuario_id: "u1",
      token_hash: "access-hash-1",
      refresh_token_hash: hash(refreshAtual),
      refresh_expira_em: new Date(Date.now() - 1000),
      refresh_family_id: randomUUID(),
      revoked_at: null,
    });
    const r = await service.rotacionarRefresh({ refreshToken: refreshAtual });
    expect(r).toEqual({ ok: false, motivo: "invalido" });
    expect(store.rows.get("s1")!.refresh_token_hash).toBe(hash(refreshAtual)); // não rotacionou
  });

  it("sessão revogada → inválido", async () => {
    const refreshAtual = service.generateRefreshToken();
    store.rows.set("s1", {
      id: "s1",
      usuario_id: "u1",
      token_hash: "access-hash-1",
      refresh_token_hash: hash(refreshAtual),
      refresh_expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      refresh_family_id: randomUUID(),
      revoked_at: new Date(),
    });
    const r = await service.rotacionarRefresh({ refreshToken: refreshAtual });
    expect(r).toEqual({ ok: false, motivo: "invalido" });
  });

  it("REUSE: token já rotacionado (anterior) → revoga TODAS as sessões do usuário", async () => {
    const refreshAntigo = service.generateRefreshToken();
    const refreshNovo = service.generateRefreshToken();
    store.rows.set("s1", {
      id: "s1",
      usuario_id: "u1",
      token_hash: "access-2",
      refresh_token_hash: hash(refreshNovo),
      refresh_token_hash_anterior: hash(refreshAntigo),
      refresh_expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      refresh_family_id: randomUUID(),
      revoked_at: null,
    });
    store.rows.set("s2", {
      id: "s2",
      usuario_id: "u1",
      token_hash: "access-outro",
      refresh_token_hash: hash(service.generateRefreshToken()),
      refresh_expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      refresh_family_id: randomUUID(),
      revoked_at: null,
    });

    // Usar o token ANTIGO (já rotacionado) = roubo provável.
    const r = await service.rotacionarRefresh({ refreshToken: refreshAntigo });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe("reuso");
    expect(store.rows.get("s1")!.revoked_at).toBeInstanceOf(Date);
    expect(store.rows.get("s2")!.revoked_at).toBeInstanceOf(Date); // TODAS as sessões
  });

  it("token desconhecido → inválido", async () => {
    const r = await service.rotacionarRefresh({ refreshToken: "token-que-nao-existe" });
    expect(r).toEqual({ ok: false, motivo: "invalido" });
  });

  it("revogarTodasSessoes: revoga apenas as ativas", async () => {
    store.rows.set("s1", {
      id: "s1",
      usuario_id: "u1",
      token_hash: "a1",
      revoked_at: null,
    });
    store.rows.set("s2", {
      id: "s2",
      usuario_id: "u1",
      token_hash: "a2",
      revoked_at: new Date(), // já revogada — não conta
    });
    const count = await service.revogarTodasSessoes("u1");
    expect(count).toBe(1);
  });
});
