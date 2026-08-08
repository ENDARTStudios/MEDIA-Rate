/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdminService } from "../src/modules/admin/admin.service.js";

function makeMocks(
  dados: {
    usuariosTotal?: number;
    usuariosAtivos7d?: number;
    midiasTotal?: number;
    porTipo?: { tipo: string; _count: { _all: number } }[];
    entries?: number;
    usuariosComWatchlist?: number;
    sessoesAtivas?: number;
    planos?: { plano: string; _count: { _all: number } }[];
  } = {},
) {
  const prisma = {
    usuario: {
      count: vi.fn(async ({ where }: any) =>
        where?.ultimo_login_em ? (dados.usuariosAtivos7d ?? 0) : (dados.usuariosTotal ?? 0),
      ),
    },
    midia: {
      count: vi.fn(async () => dados.midiasTotal ?? 0),
      groupBy: vi.fn(async () => dados.porTipo ?? []),
    },
    watchlistEntry: {
      count: vi.fn(async () => dados.entries ?? 0),
      groupBy: vi.fn(async () =>
        Array.from({ length: dados.usuariosComWatchlist ?? 0 }, () => ({})),
      ),
    },
    sessao: { count: vi.fn(async () => dados.sessoesAtivas ?? 0) },
    usuarioPlano: {
      groupBy: vi.fn(async () => dados.planos ?? []),
    },
  };
  const cache = {
    readThroughWithStatus: vi.fn(
      async (_k: string, _ttl: number, fetchFn: () => Promise<unknown>) => ({
        value: await fetchFn(),
        hit: false,
      }),
    ),
  };
  const service = new AdminService(prisma as any, cache as any);
  return { service, prisma, cache };
}

describe("AdminService — stats reais (T221, 4.7)", () => {
  let m: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    m = makeMocks();
  });

  it("calcula contagens agregadas corretamente (usuários/mídias/watchlists/sessões/planos)", async () => {
    m = makeMocks({
      usuariosTotal: 120,
      usuariosAtivos7d: 45,
      midiasTotal: 500,
      porTipo: [
        { tipo: "FILME", _count: { _all: 300 } },
        { tipo: "SERIE", _count: { _all: 150 } },
        { tipo: "GAME", _count: { _all: 50 } },
      ],
      entries: 2100,
      usuariosComWatchlist: 80,
      sessoesAtivas: 33,
      planos: [
        { plano: "FREE", _count: { _all: 100 } },
        { plano: "PLUS", _count: { _all: 15 } },
        { plano: "PREMIUM", _count: { _all: 5 } },
      ],
    });
    const { value } = await m.service.getStats();
    expect(value.usuarios).toEqual({ total: 120, ativos_7d: 45 });
    expect(value.midias.total).toBe(500);
    expect(value.midias.por_tipo).toEqual({ FILME: 300, SERIE: 150, GAME: 50 });
    expect(value.watchlists).toEqual({ total_entries: 2100, usuarios_com_watchlist: 80 });
    expect(value.sessoes.ativas).toBe(33);
    expect(value.planos).toEqual({ free: 100, plus: 15, premium: 5 });
    // Nenhum dado sensível na resposta.
    expect(JSON.stringify(value)).not.toMatch(/email|password|token/i);
  });

  it("banco vazio → zeros (não erro) e midias filtram deletadas", async () => {
    const { value, hit } = await m.service.getStats();
    expect(value.usuarios).toEqual({ total: 0, ativos_7d: 0 });
    expect(value.midias).toEqual({ total: 0, por_tipo: {} });
    expect(value.watchlists).toEqual({ total_entries: 0, usuarios_com_watchlist: 0 });
    expect(value.sessoes.ativas).toBe(0);
    expect(value.planos).toEqual({ free: 0, plus: 0, premium: 0 });
    expect(hit).toBe(false);
    // midia.count chamado com filtro deleted_at: null (soft delete).
    expect(m.prisma.midia.count).toHaveBeenCalledWith({ where: { deleted_at: null } });
    // sessao.count com expires_at > now e revoked_at null.
    expect(m.prisma.sessao.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ revoked_at: null }),
    });
  });

  it("cache: readThrough com chave admin:stats e TTL 60s", async () => {
    await m.service.getStats();
    expect(m.cache.readThroughWithStatus).toHaveBeenCalledWith(
      "admin:stats",
      60,
      expect.any(Function),
    );
  });
});
