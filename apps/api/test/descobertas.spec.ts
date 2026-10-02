/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { InteracoesService } from "../src/modules/interacoes/interacoes.service.js";

// Mídia devolvida pelo include real (MIDIA_INTERACAO_SELECT) — o mapper (T038)
// exige `midia` no item devolvido pelo upsert.
const midiaDe = (id: string) => ({
  id,
  slug: `slug-${id}`,
  titulo: `Título ${id}`,
  tipo: "FILME",
  ano_lancamento: 2024,
  imagem_url: null,
  score: 80,
});

function mockPrisma() {
  const prisma = {
    midia: {
      findUnique: vi.fn(async ({ where }: any) =>
        ["midia-1", "m-destino"].includes(where.id) ? { id: where.id } : null,
      ),
      findMany: vi.fn(async () => []),
    },
    relacaoObra: { findUnique: vi.fn(), findMany: vi.fn() },
    usuarioMidiaInteracao: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    watchlistEntry: { upsert: vi.fn(async () => ({ id: "w1", coluna: "WANT" })) },
    // T286 — descobertas() faz UNION com DiscoveryEvents.
    discoveryEvent: { findMany: vi.fn(async () => []) },
  };
  return { prisma };
}

const REL = {
  id: "rel-1",
  origem_id: "m-livro",
  destino_id: "m-destino",
  tipo: "ADAPTACAO_DE",
  origem: { id: "m-livro", titulo: "Duna (livro)", tipo: "LIVRO", imagem_url: null, score: 92 },
  destino: { id: "m-destino", titulo: "Duna (filme)", tipo: "FILME", imagem_url: null, score: 95 },
};

describe("T201 — interacoes.service (descobertas + taste/history, G4)", () => {
  let prisma: any;
  let service: InteracoesService;

  beforeEach(() => {
    ({ prisma } = mockPrisma());
    service = new InteracoesService(prisma);
  });

  // ---- origem_relacao_id ------------------------------------------------
  it("upsert aceita origemRelacaoId que conecta a mídia e grava a FK", async () => {
    prisma.relacaoObra.findUnique.mockResolvedValue(REL);
    prisma.usuarioMidiaInteracao.findUnique.mockResolvedValue(null);
    prisma.usuarioMidiaInteracao.upsert.mockImplementation(async ({ create }: any) => ({
      id: "i1",
      ...create,
      midia: midiaDe(create.midia_id),
    }));
    const r = await service.upsert("user-1", "m-destino", { origemRelacaoId: "rel-1" });
    expect(r.origem_relacao_id).toBe("rel-1");
    expect(r.status).toBe("QUERO_CONSUMIR");
  });

  it("origemRelacaoId inexistente → 400", async () => {
    prisma.relacaoObra.findUnique.mockResolvedValue(null);
    prisma.usuarioMidiaInteracao.findUnique.mockResolvedValue(null);
    prisma.usuarioMidiaInteracao.upsert.mockImplementation(async ({ create }: any) => create);
    await expect(
      service.upsert("user-1", "m-destino", { origemRelacaoId: "rel-x" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("origemRelacaoId que NÃO conecta a mídia → 400", async () => {
    prisma.relacaoObra.findUnique.mockResolvedValue(REL); // conecta m-destino, não midia-1
    prisma.usuarioMidiaInteracao.findUnique.mockResolvedValue(null);
    prisma.usuarioMidiaInteracao.upsert.mockImplementation(async ({ create }: any) => create);
    await expect(
      service.upsert("user-1", "midia-1", { origemRelacaoId: "rel-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("update parcial de status NÃO apaga a origem da descoberta", async () => {
    const existente = {
      id: "i1",
      usuario_id: "user-1",
      midia_id: "m-destino",
      status: "QUERO_CONSUMIR",
      origem_relacao_id: "rel-1",
      iniciado_em: null,
    };
    prisma.usuarioMidiaInteracao.findUnique.mockResolvedValue(existente);
    prisma.usuarioMidiaInteracao.upsert.mockImplementation(async ({ update }: any) => ({
      ...existente,
      ...update,
      midia: midiaDe(existente.midia_id),
    }));
    const r = await service.upsert("user-1", "m-destino", { status: "CONSUMINDO" });
    expect(r.origem_relacao_id).toBe("rel-1");
  });

  // ---- GET /discoveries -------------------------------------------------
  it("descobertas: query sem N+1 (orderBy desc, filtro origem not null)", async () => {
    prisma.usuarioMidiaInteracao.findMany.mockResolvedValue([]);
    await service.descobertas("user-1");
    expect(prisma.usuarioMidiaInteracao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuario_id: "user-1", origem_relacao_id: { not: null } },
        orderBy: { atualizado_em: "desc" },
      }),
    );
  });

  it("descobertas: mapeia from=outra ponta da aresta, to=mídia descoberta", async () => {
    const interacao = {
      id: "i1",
      usuario_id: "user-1",
      midia_id: "m-destino",
      status: "CONCLUIDO",
      atualizado_em: new Date("2026-08-01T00:00:00Z"),
      midia: REL.destino,
      origem_relacao: REL,
    };
    prisma.usuarioMidiaInteracao.findMany.mockResolvedValue([interacao]);
    const r = await service.descobertas("user-1");
    expect(r.length).toBe(1);
    expect(r[0].fromMediaId).toBe("m-livro");
    expect(r[0].fromMediaType).toBe("LIVRO");
    expect(r[0].toMediaId).toBe("m-destino");
    expect(r[0].toMediaType).toBe("FILME");
    expect(r[0].relationType).toBe("ADAPTACAO_DE");
    expect(r[0].fromMedia.titulo).toBe("Duna (livro)");
  });

  it("descobertas: ignora interações sem origem_relacao (não-vindas do prompt)", async () => {
    const semOrigem = {
      id: "i2",
      midia_id: "m-destino",
      midia: REL.destino,
      origem_relacao: null,
    };
    prisma.usuarioMidiaInteracao.findMany.mockResolvedValue([semOrigem]);
    const r = await service.descobertas("user-1");
    expect(r.length).toBe(0);
  });

  it("T397 — descobertas vazias caem no fallback por gênero (MESMO_GENERO)", async () => {
    // 1ª chamada (relações) vazia; 2ª chamada (consumidos) tem um CONCLUIDO.
    prisma.usuarioMidiaInteracao.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        midia_id: "m-consumido",
        status: "CONCLUIDO",
        atualizado_em: new Date("2026-08-01T00:00:00Z"),
        midia: {
          id: "m-consumido",
          titulo: "Duna (filme)",
          tipo: "FILME",
          imagem_url: null,
          score: 95,
          generos: [{ genero: { slug: "ficcao-cientifica" } }],
        },
      },
    ]);
    prisma.midia.findMany.mockResolvedValue([
      { id: "m-recomendado", titulo: "Interestelar", tipo: "FILME", imagem_url: null, score: 90 },
    ]);

    const r = await service.descobertas("user-1");
    expect(r.length).toBe(1);
    expect(r[0].relationType).toBe("MESMO_GENERO");
    expect(r[0].fromMediaId).toBe("m-consumido");
    expect(r[0].toMediaId).toBe("m-recomendado");
  });

  // ---- GET /taste/history ------------------------------------------------
  // T038: relógio congelado (2026-08) — o teste afirmava contra "hoje" e
  // quebrava a cada virada de mês. Datas do fixture continuam fixas em ISO.
  it("taste/history: 12 meses ascendentes com pesos normalizados por gênero narrativo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00Z"));
    try {
      prisma.usuarioMidiaInteracao.findMany.mockResolvedValue([
        {
          status: "CONCLUIDO",
          iniciado_em: null,
          concluido_em: new Date("2026-08-15T00:00:00Z"),
          atualizado_em: new Date("2026-08-15T00:00:00Z"),
          midia: {
            generos: [
              { genero: { slug: "ficcao-cientifica", tipo: "NARRATIVO" } },
              { genero: { slug: "aventura", tipo: "NARRATIVO" } },
              { genero: { slug: "subgenero", tipo: "SUBGENERO" } }, // ignorado
            ],
          },
        },
      ]);
      const r = await service.historicoTaste("user-1");
      expect(r.length).toBe(12);
      const last = r[r.length - 1];
      expect(last.month).toBe("2026-08");
      expect(Object.keys(last.genreWeights).sort()).toEqual(["aventura", "ficcao-cientifica"]);
      const soma = Object.values(last.genreWeights).reduce((a: number, b: number) => a + b, 0);
      expect(soma).toBeCloseTo(1, 4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("taste/history: sem interações → 12 meses com pesos vazios (nunca fabrica)", async () => {
    prisma.usuarioMidiaInteracao.findMany.mockResolvedValue([]);
    const r = await service.historicoTaste("user-1");
    expect(r.length).toBe(12);
    expect(r.every((m: any) => Object.keys(m.genreWeights).length === 0)).toBe(true);
  });
});
