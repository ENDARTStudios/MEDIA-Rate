import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * T276/D-265 — auditoria exaustiva de ids IGDB: resolver por slug/nome,
 * reconciliação seed x banco, merge NÃO-destrutivo de órfãos e ground-truth.
 *
 * O audit-igdb-ids roda `main()` apenas quando chamado direto; aqui
 * testamos as funções exportadas com PrismaClient/fetch mockados.
 */
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function () {
    return {
      midia: {
        findMany: vi.fn(async () => []),
        findUnique: vi.fn(async () => null),
        update: vi.fn(async () => ({})),
        delete: vi.fn(async () => ({})),
      },
      $disconnect: vi.fn(async () => undefined),
    };
  }),
}));

import {
  melhorCandidato,
  nomeConfere,
  normalizarTitulo,
  resetTokenTwitch,
} from "../prisma/igdb-http.js";
import { resolverIdIgdb, GAMES_CURADOS } from "../prisma/seed-games.js";
import {
  reconciliarBanco,
  mesclarDuplicados,
  corrigirRegistro,
  type LinhaAuditoria,
} from "../scripts/audit-igdb-ids.js";

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(handler));
}

function mockPrisma(sobre: Record<string, unknown> = {}) {
  const base = {
    avaliacaoFonte: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    usuarioMidiaInteracao: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    watchlistEntry: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    listaItem: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    midiaGenero: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    midiaStreaming: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    midiaFranquia: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    mediaScore: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    mediaScoreView: { updateMany: vi.fn(async () => ({ count: 0 })) },
    notificacao: { updateMany: vi.fn(async () => ({ count: 0 })) },
    relacaoObra: { updateMany: vi.fn(async () => ({ count: 0 })) },
    midia: {
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
  };
  // Deep-merge: override por modelo sem descartar os métodos da base.
  const merged: Record<string, unknown> = { ...base };
  for (const [modelo, metodos] of Object.entries(sobre)) {
    merged[modelo] = { ...(base[modelo] as object), ...(metodos as object) };
  }
  return merged as unknown as import("@prisma/client").PrismaClient;
}

describe("T276 — auditoria de ids IGDB (D-265)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetTokenTwitch();
  });

  describe("Ground-truth mantido (T268)", () => {
    it("Elden Ring/Terraria/Hades com ids já corrigidos", () => {
      const porSlug = new Map(GAMES_CURADOS.map((g) => [g.slug, g.igdbId]));
      expect(porSlug.get("elden-ring")).toBe(119133);
      expect(porSlug.get("terraria")).toBe(1879);
      expect(porSlug.get("hades")).toBe(127762);
    });

    it("lista do seed não tem slugs duplicados (uma entrada por game)", () => {
      const slugs = GAMES_CURADOS.map((g) => g.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe("resolverIdIgdb — correção derivada do lookup", () => {
    it("slug exato → retorna o id do IGDB", async () => {
      process.env.TWITCH_CLIENT_ID = "cid";
      process.env.TWITCH_CLIENT_SECRET = "sec";
      mockFetch((url, init) => {
        if (url.includes("id.twitch.tv"))
          return Promise.resolve(jsonRes({ access_token: "tok", expires_in: 3600 }));
        if (url.includes("api.igdb.com")) {
          expect(String(init?.body)).toContain('where slug = "elden-ring"');
          return Promise.resolve(jsonRes([{ id: 119133, slug: "elden-ring" }]));
        }
        return Promise.resolve(jsonRes([]));
      });
      await expect(resolverIdIgdb("elden-ring", "Elden Ring", 99999)).resolves.toBe(119133);
    });

    it("slug sem match → re-mapeia por nome (nunca mantém id errado em silêncio)", async () => {
      process.env.TWITCH_CLIENT_ID = "cid";
      process.env.TWITCH_CLIENT_SECRET = "sec";
      mockFetch((url, init) => {
        if (url.includes("id.twitch.tv"))
          return Promise.resolve(jsonRes({ access_token: "tok", expires_in: 3600 }));
        if (url.includes("api.igdb.com")) {
          const body = String(init?.body ?? "");
          if (body.includes("search")) {
            return Promise.resolve(
              jsonRes([{ id: 1086940, name: "Baldur's Gate 3", slug: "baldurs-gate-3" }]),
            );
          }
          return Promise.resolve(jsonRes([])); // slug não achou
        }
        return Promise.resolve(jsonRes([]));
      });
      await expect(resolverIdIgdb("baldur-s-gate-3", "Baldur's Gate 3", 99999)).resolves.toBe(
        1086940,
      );
    });

    it("sem credenciais IGDB → fallback curado (seed nunca aborta)", async () => {
      delete process.env.TWITCH_CLIENT_ID;
      delete process.env.TWITCH_CLIENT_SECRET;
      mockFetch(() => Promise.resolve(jsonRes([])));
      await expect(resolverIdIgdb("elden-ring", "Elden Ring", 119133)).resolves.toBe(119133);
    });

    it("IGDB com erro HTTP → fallback curado (graceful)", async () => {
      process.env.TWITCH_CLIENT_ID = "cid";
      process.env.TWITCH_CLIENT_SECRET = "sec";
      mockFetch(() => Promise.resolve(new Response("erro", { status: 500 })));
      await expect(resolverIdIgdb("hades", "Hades", 127762)).resolves.toBe(127762);
    });
  });

  describe("melhorCandidato / normalizarTitulo", () => {
    it("normaliza acentos/caixa/pontuação", () => {
      expect(normalizarTitulo("God of War Ragnarök!")).toBe("god of war ragnarok");
      expect(normalizarTitulo("  A Plague Tale: Requiem  ")).toBe("a plague tale requiem");
    });

    it("escolhe o candidato com maior sobreposição (≥ 50%)", () => {
      const candidatos = [
        { id: 111, name: "Horizon Zero Dawn", slug: "horizon-zero-dawn" },
        { id: 222, name: "Horizon Forbidden West", slug: "horizon-forbidden-west" },
      ];
      const melhor = melhorCandidato("Horizon Forbidden West", candidatos);
      expect(melhor?.id).toBe(222);
    });

    it("rejeita candidato com sobreposição fraca (evita falso positivo)", () => {
      // O "melhor candidato" pode ser próximo — mas a AUTO-CORREÇÃO só
      // acontece com casamento estrito (nomeConfere).
      const melhor = melhorCandidato("Elden Ring", [{ id: 1, name: "Ring Fit Adventure" }]);
      expect(melhor?.id).toBe(1);
      expect(nomeConfere("Elden Ring", melhor)).toBe(false);
      expect(nomeConfere("Elden Ring", { id: 119133, name: "Elden Ring" })).toBe(true);
      expect(nomeConfere("Baldur's Gate 3", { id: 1086940, name: "Baldur's Gate 3" })).toBe(true);
    });
  });

  describe("reconciliarBanco — órfãos e faltantes (51 vs 52)", () => {
    it("detecta órfão (id antigo fora do seed) e faltantes", () => {
      const banco = [
        { id: "a", titulo: "Elden Ring", fonte_id: "121956" }, // órfão do fix antigo
        { id: "b", titulo: "Elden Ring", fonte_id: "119133" },
      ];
      const linhas: LinhaAuditoria[] = [
        {
          nome: "Elden Ring",
          slug: "elden-ring",
          idCurado: 119133,
          idIgdb: 119133,
          status: "OK",
          nomeIgdb: null,
          slugIgdb: "elden-ring",
        },
        {
          nome: "Hades",
          slug: "hades",
          idCurado: 127762,
          idIgdb: 127762,
          status: "OK",
          nomeIgdb: null,
          slugIgdb: "hades",
        },
      ];
      const rec = reconciliarBanco(banco, linhas);
      expect(rec.totalSeed).toBe(2);
      expect(rec.totalBanco).toBe(2);
      expect(rec.orfaos.map((o) => o.fonte_id)).toEqual(["121956"]);
      expect(rec.faltando.map((f) => f.nome)).toEqual(["Hades"]);
    });
  });

  describe("mesclarDuplicados — merge NÃO-destrutivo", () => {
    it("reponta relações, remove duplicatas do destino e isola o órfão", async () => {
      const prisma = mockPrisma({
        avaliacaoFonte: {
          findMany: vi.fn(async () => [{ fonte: "igdb" }, { fonte: "steam" }]),
          deleteMany: vi.fn(async () => ({ count: 1 })),
          updateMany: vi.fn(async () => ({ count: 2 })),
        },
        watchlistEntry: {
          findMany: vi.fn(async () => [{ usuario_id: "u1" }]),
          deleteMany: vi.fn(async () => ({ count: 0 })),
          updateMany: vi.fn(async () => ({ count: 1 })),
        },
      });
      const res = await mesclarDuplicados(prisma, "de-id", "para-id");

      expect(prisma.avaliacaoFonte.deleteMany).toHaveBeenCalledWith({
        where: { midia_id: "para-id", fonte: { in: ["igdb", "steam"] } },
      });
      expect(prisma.avaliacaoFonte.updateMany).toHaveBeenCalledWith({
        where: { midia_id: "de-id" },
        data: { midia_id: "para-id" },
      });
      expect(prisma.watchlistEntry.updateMany).toHaveBeenCalledWith({
        where: { midia_id: "de-id" },
        data: { midia_id: "para-id" },
      });
      expect(prisma.mediaScore.deleteMany).toHaveBeenCalledWith({
        where: { midia_id: "para-id" },
      });
      expect(prisma.midia.update).toHaveBeenCalledWith({
        where: { id: "de-id" },
        data: expect.objectContaining({ deleted_at: expect.any(Date), score: null }),
      });
      expect(res).toEqual({ movidos: 3, isolado: true });
      expect(prisma.midia.delete).not.toHaveBeenCalled();
    });
  });

  describe("corrigirRegistro — update ou merge", () => {
    it("sem registro com o id certo → atualiza fonte_id (relações preservadas)", async () => {
      const prisma = mockPrisma({
        midia: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({ id: "a", titulo: "BG3" })
            .mockResolvedValueOnce(null),
          update: vi.fn(async () => ({})),
        },
      });
      const res = await corrigirRegistro(prisma, { nome: "BG3", idCurado: 999, idIgdb: 1086940 });
      expect(res.acao).toBe("update");
      expect(prisma.midia.update).toHaveBeenCalledWith({
        where: { id: "a" },
        data: { fonte_id: "1086940" },
      });
    });

    it("com registro do id certo → merge (nunca delete direto)", async () => {
      const prisma = mockPrisma({
        midia: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({ id: "de", titulo: "Elden Ring" })
            .mockResolvedValueOnce({ id: "para", titulo: "Elden Ring" }),
        },
      });
      const res = await corrigirRegistro(prisma, {
        nome: "Elden Ring",
        idCurado: 121956,
        idIgdb: 119133,
      });
      expect(res.acao).toBe("merge");
      expect(prisma.midia.delete).not.toHaveBeenCalled();
      expect(prisma.midia.update).toHaveBeenCalledWith({
        where: { id: "de" },
        data: expect.objectContaining({ deleted_at: expect.any(Date) }),
      });
    });
  });
});
