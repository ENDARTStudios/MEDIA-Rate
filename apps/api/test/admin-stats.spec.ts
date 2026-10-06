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
    discoveryTotal?: number;
    usuariosComDiscovery?: number;
    interacoesTotal?: number;
    usuariosBanidos?: number;
    excluidas?: number;
    usuariosCriadosEm?: { created_at: Date }[];
    interacoesAtualizadosEm?: {
      atualizado_em: Date;
      midia?: { tipo: string };
    }[];
  } = {},
) {
  const prisma = {
    usuario: {
      count: vi.fn(async ({ where }: any) => {
        if (where?.banido_em) return dados.usuariosBanidos ?? 0;
        return where?.ultimo_login_em ? (dados.usuariosAtivos7d ?? 0) : (dados.usuariosTotal ?? 0);
      }),
      findMany: vi.fn(async () => dados.usuariosCriadosEm ?? []),
    },
    auditLog: {
      count: vi.fn(async () => dados.excluidas ?? 0),
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
    usuarioMidiaInteracao: {
      count: vi.fn(async () => dados.interacoesTotal ?? 0),
      findMany: vi.fn(async () => dados.interacoesAtualizadosEm ?? []),
    },
    // T286 — métrica de Descobertas (agregados anonimizados).
    discoveryEvent: {
      count: vi.fn(async () => dados.discoveryTotal ?? 0),
      groupBy: vi.fn(async () =>
        Array.from({ length: dados.usuariosComDiscovery ?? 0 }, () => ({})),
      ),
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
    m = makeMocks({ interacoesTotal: 26 });
  });

  it("calcula contagens agregadas corretamente (usuários/mídias/watchlists/sessões/planos)", async () => {
    m = makeMocks({
      usuariosTotal: 120,
      interacoesTotal: 26,
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
    expect(value.usuarios).toEqual({ total: 120, ativos_7d: 45, banidos: 0, excluidas: 0 });
    expect(value.midias.total).toBe(500);
    expect(value.midias.por_tipo).toEqual({ FILME: 300, SERIE: 150, GAME: 50 });
    expect(value.watchlists).toEqual({ total_entries: 2100, usuarios_com_watchlist: 80 });
    expect(value.sessoes.ativas).toBe(33);
    expect(value.planos).toEqual({ free: 100, plus: 15, premium: 5 });
    expect(value.interacoes).toEqual({ total: 26 });
    // Onda 7: evolução 12m zero-preenchida (sem timestamps no fixture → zeros)
    expect(value.evolucao).toHaveLength(12);
    expect(value.evolucao.every((e) => e.novos_usuarios === 0 && e.interacoes === 0)).toBe(true);
    // Nenhum dado sensível na resposta.
    expect(JSON.stringify(value)).not.toMatch(/email|password|token/i);
  });

  it("Onda 7: evolução mensal conta novos usuários e interações por mês", async () => {
    m = makeMocks({
      // construtor local (não UTC) — o bucket usa getFullYear/Month locais
      usuariosCriadosEm: [
        { created_at: new Date(2026, 7, 15) },
        { created_at: new Date(2026, 7, 20) },
        { created_at: new Date(2026, 8, 2) },
      ],
      interacoesAtualizadosEm: [
        { atualizado_em: new Date(2026, 8, 10), midia: { tipo: "FILME" } },
        { atualizado_em: new Date(2026, 8, 11), midia: { tipo: "GAME" } },
        { atualizado_em: new Date(2026, 9, 1), midia: { tipo: "FILME" } },
      ],
    });
    const value = await m.service.getStats().then((r) => r.value);
    expect(value.evolucao).toHaveLength(12);
    const ago = value.evolucao.find((e) => e.mes === "2026-08");
    const set = value.evolucao.find((e) => e.mes === "2026-09");
    expect(ago).toMatchObject({ novos_usuarios: 2, interacoes: 0 });
    expect(set).toMatchObject({ novos_usuarios: 1, interacoes: 2 });
  });

  it("Onda 8: banidos, contas excluídas (trilha LGPD) e interesse por tipo", async () => {
    m = makeMocks({
      usuariosTotal: 120,
      usuariosBanidos: 3,
      excluidas: 7,
      interacoesAtualizadosEm: [
        { atualizado_em: new Date(2026, 9, 1), midia: { tipo: "FILME" } },
        { atualizado_em: new Date(2026, 9, 2), midia: { tipo: "FILME" } },
        { atualizado_em: new Date(2026, 9, 3), midia: { tipo: "GAME" } },
      ],
    });
    const value = await m.service.getStats().then((r) => r.value);
    expect(value.usuarios).toMatchObject({ banidos: 3, excluidas: 7 });
    expect(value.interacoes_por_tipo).toEqual({ FILME: 2, GAME: 1 });
  });

  it("banco vazio → zeros (não erro) e midias filtram deletadas", async () => {
    const { value, hit } = await m.service.getStats();
    expect(value.usuarios).toEqual({ total: 0, ativos_7d: 0, banidos: 0, excluidas: 0 });
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
