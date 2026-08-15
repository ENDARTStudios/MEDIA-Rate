import { describe, it, expect } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { WatchlistService } from "../src/modules/watchlist/watchlist.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { BadRequestException, NotFoundException } from "@nestjs/common";

const U1 = "user-1";
const U2 = "user-2";
const ORFAO = "00000000-0000-4000-8000-00000000000a";
const CANONICA = "00000000-0000-4000-8000-00000000000b";

interface Ent {
  id: string;
  usuario_id: string;
  midia_id: string;
  coluna: string;
  reacao: string | null;
  motivo_abandono: string | null;
  progresso_detalhe: string | null;
  created_at: Date;
}

function buildMock(entries: Ent[], midias: string[] = [CANONICA]) {
  const interacoes: {
    usuario_id: string;
    midia_id: string;
    status: string;
    reacao: string | null;
  }[] = [];
  const prisma = {
    watchlistEntry: {
      findFirst: async (args: {
        where: {
          id?: string | { not: string };
          usuario_id?: string;
          midia_id?: string;
        };
      }) => {
        return (
          entries.find((e) => {
            const w = args.where;
            if (w.id !== undefined) {
              if (typeof w.id === "string") {
                if (e.id !== w.id) return false;
              } else if (w.id && "not" in w.id) {
                if (e.id === w.id.not) return false;
              }
            }
            if (w.usuario_id !== undefined && e.usuario_id !== w.usuario_id) return false;
            if (w.midia_id !== undefined && e.midia_id !== w.midia_id) return false;
            return true;
          }) ?? null
        );
      },
      findUnique: async (args: { where: { id: string } }) =>
        entries.find((e) => e.id === args.where.id) ?? null,
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const e = entries.find((x) => x.id === args.where.id);
        if (!e) return null;
        Object.assign(e, args.data);
        return e;
      },
      delete: async (args: { where: { id: string } }) => {
        const i = entries.findIndex((e) => e.id === args.where.id);
        if (i >= 0) entries.splice(i, 1);
        return {};
      },
    },
    midia: {
      findUnique: async (args: { where: { id: string } }) =>
        midias.includes(args.where.id) ? { id: args.where.id } : null,
    },
    usuarioMidiaInteracao: {
      upsert: async (args: {
        where: { usuario_id_midia_id: { usuario_id: string; midia_id: string } };
        create: { usuario_id: string; midia_id: string; status: string; reacao: string | null };
        update: Record<string, unknown>;
      }) => {
        const ex = interacoes.find(
          (i) =>
            i.usuario_id === args.where.usuario_id_midia_id.usuario_id &&
            i.midia_id === args.where.usuario_id_midia_id.midia_id,
        );
        if (ex) {
          Object.assign(ex, args.update);
        } else {
          interacoes.push({
            usuario_id: args.create.usuario_id,
            midia_id: args.create.midia_id,
            status: args.create.status,
            reacao: args.create.reacao,
          });
        }
        return {};
      },
      deleteMany: async (args: { where: { usuario_id: string; midia_id: string } }) => {
        const i = interacoes.findIndex(
          (x) => x.usuario_id === args.where.usuario_id && x.midia_id === args.where.midia_id,
        );
        if (i >= 0) interacoes.splice(i, 1);
        return { count: 1 };
      },
    },
  };
  return { prisma, interacoes, entries };
}

async function buildService(prisma: unknown): Promise<WatchlistService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [WatchlistService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return module.get<WatchlistService>(WatchlistService);
}

function orfao(over: Partial<Ent> = {}): Ent {
  return {
    id: "entry-1",
    usuario_id: U1,
    midia_id: ORFAO,
    coluna: "COMPLETED",
    reacao: "GOSTEI",
    motivo_abandono: null,
    progresso_detalhe: "zerado",
    created_at: new Date("2026-01-01"),
    ...over,
  };
}

describe("WatchlistService T322 — relink de órfão", () => {
  it("re-linka órfão para canônica preservando reação/progresso", async () => {
    const { prisma, interacoes, entries } = buildMock([orfao()]);
    const service = await buildService(prisma);

    const r = await service.relink(U1, "entry-1", CANONICA);

    expect(r.midia_id).toBe(CANONICA);
    expect(r.reacao).toBe("GOSTEI");
    expect(r.progresso_detalhe).toBe("zerado");
    expect(entries.find((e) => e.id === "entry-1")?.midia_id).toBe(CANONICA);
    expect(interacoes).toHaveLength(1);
    expect(interacoes[0]).toMatchObject({ usuario_id: U1, midia_id: CANONICA, reacao: "GOSTEI" });
  });

  it("midia_id não-UUID lança BadRequestException", async () => {
    const { prisma } = buildMock([orfao()]);
    const service = await buildService(prisma);
    await expect(service.relink(U1, "entry-1", "not-a-uuid")).rejects.toThrow(BadRequestException);
  });

  it("entrada de outro usuário lança NotFoundException", async () => {
    const { prisma } = buildMock([orfao()]);
    const service = await buildService(prisma);
    await expect(service.relink(U2, "entry-1", CANONICA)).rejects.toThrow(NotFoundException);
  });

  it("mídia canônica inexistente lança NotFoundException", async () => {
    const { prisma } = buildMock([orfao()], []);
    const service = await buildService(prisma);
    await expect(service.relink(U1, "entry-1", CANONICA)).rejects.toThrow(NotFoundException);
  });

  it("colisão: usuário já tem a canônica → merge preserva reação da antiga", async () => {
    const canonicEntry: Ent = {
      id: "entry-2",
      usuario_id: U1,
      midia_id: CANONICA,
      coluna: "WANT",
      reacao: null,
      motivo_abandono: null,
      progresso_detalhe: null,
      created_at: new Date("2025-12-01"),
    };
    const { prisma, entries } = buildMock([orfao(), canonicEntry]);
    const service = await buildService(prisma);

    const r = await service.relink(U1, "entry-1", CANONICA);

    // A mais recente (órfã, 2026-01-01) sobrevive e a antiga é removida.
    expect(entries.some((e) => e.id === "entry-2")).toBe(false);
    expect(r.reacao).toBe("GOSTEI");
  });
});
