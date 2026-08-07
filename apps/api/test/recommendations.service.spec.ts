/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { RecommendationsService } from "../src/modules/recommendations/recommendations.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

const MIDIAS = [
  {
    id: "m1",
    titulo: "Filme Ação 1",
    tipo: "FILME",
    ano_lancamento: 2020,
    imagem_url: null,
    score: 8.5,
    generos: [{ genero: { slug: "acao" } }],
  },
  {
    id: "m2",
    titulo: "Filme Ação 2",
    tipo: "FILME",
    ano_lancamento: 2021,
    imagem_url: null,
    score: 8.0,
    generos: [{ genero: { slug: "acao" } }],
  },
  {
    id: "m3",
    titulo: "Filme Drama 1",
    tipo: "FILME",
    ano_lancamento: 2019,
    imagem_url: null,
    score: 9.0,
    generos: [{ genero: { slug: "drama" } }],
  },
  {
    id: "m4",
    titulo: "Série Ação",
    tipo: "SERIE",
    ano_lancamento: 2022,
    imagem_url: null,
    score: 7.0,
    generos: [{ genero: { slug: "acao" } }],
  },
  {
    id: "x",
    titulo: "Recomendado Colab",
    tipo: "FILME",
    ano_lancamento: 2023,
    imagem_url: null,
    score: 8.2,
    generos: [{ genero: { slug: "acao" } }],
  },
];

interface Entry {
  usuario_id: string;
  midia_id: string;
}

function makePrisma(entries: Entry[]) {
  const watchlistEntry = {
    findMany: vi.fn(async (args: any) => {
      const where = args.where ?? {};
      let out = entries;
      if (where.usuario_id && typeof where.usuario_id === "string") {
        out = out.filter((e) => e.usuario_id === where.usuario_id);
      }
      if (where.usuario_id?.in) {
        out = out.filter((e) => where.usuario_id.in.includes(e.usuario_id));
      }
      if (where.midia_id?.in) out = out.filter((e) => where.midia_id.in.includes(e.midia_id));
      return out.map((e) => ({ ...e }));
    }),
  };
  const midia = {
    findMany: vi.fn(async (args: any) => {
      let items: typeof MIDIAS = [...MIDIAS];
      const where = args.where ?? {};
      if (where.id?.in) items = items.filter((m) => where.id.in.includes(m.id));
      if (where.OR) {
        items = items.filter((m) =>
          where.OR.some(
            (c: any) =>
              m.tipo === c.tipo &&
              m.generos.some((g) => g.genero.slug === c.generos.some.genero.slug),
          ),
        );
      }
      if (where.NOT?.id?.in) items = items.filter((m) => !where.NOT.id.in.includes(m.id));
      if (where.score?.gte != null) items = items.filter((m) => (m.score ?? 0) >= where.score.gte);
      if (args.cursor) {
        const cursorId = typeof args.cursor === "string" ? args.cursor : args.cursor.id;
        const i = items.findIndex((m) => m.id === cursorId);
        if (i >= 0) items = items.slice(i + (args.skip ?? 1));
      }
      items = [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.id < b.id ? -1 : 1));
      return items.slice(0, args.take ?? 20).map((m) => ({ ...m, generos: [...m.generos] }));
    }),
  };
  return { prisma: { watchlistEntry, midia }, watchlistEntry, midia };
}

describe("RecommendationsService (T209)", () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const ctx = makePrisma([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationsService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it("PLUS — recomenda mesmo gênero+tipo com score ≥ média da watchlist e motivo", async () => {
    // watchlist: m2 (8.0) + m3 (9.0) → média 8.5. Candidato: m1 (acao/FILME, 8.5).
    const ctx = makePrisma([
      { usuario_id: "u1", midia_id: "m2" },
      { usuario_id: "u1", midia_id: "m3" },
    ]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationsService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    const svc = module.get<RecommendationsService>(RecommendationsService);

    const r = await svc.recomendarPorGenero("u1", {});
    expect(r.recomendacoes.length).toBe(1);
    expect(r.recomendacoes[0].id).toBe("m1");
    expect(r.recomendacoes[0].motivo).toContain("Mesmo gênero que Filme Ação 2");
    // Saída sanitizada.
    const chaves = Object.keys(r.recomendacoes[0]);
    expect(chaves).toEqual(["id", "titulo", "tipo", "ano", "poster_url", "score", "motivo"]);
  });

  it("PLUS — exclui itens já na watchlist e itens com score abaixo da média", async () => {
    // watchlist: m2 (8.0) → média 8.0. Candidatos (acao/FILME): m1 (8.5 ✓)
    // e x (8.2 ✓); m2 está na lista → excluído; m3 (drama) → fora.
    const ctx = makePrisma([{ usuario_id: "u1", midia_id: "m2" }]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationsService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    const svc = module.get<RecommendationsService>(RecommendationsService);

    const r = await svc.recomendarPorGenero("u1", {});
    expect(r.recomendacoes[0].id).toBe("m1");
    expect(r.recomendacoes.some((x) => x.id === "m2")).toBe(false);
    expect(r.recomendacoes.some((x) => x.id === "m3")).toBe(false);
  });

  it("PLUS — watchlist vazia retorna mensagem amigável (200, lista vazia)", async () => {
    const r = await service.recomendarPorGenero("u1", {});
    expect(r.recomendacoes).toEqual([]);
    expect(r.mensagem).toContain("Adicione itens à sua watchlist");
  });

  it("PLUS — limite e paginação por cursor", async () => {
    const ctx = makePrisma([
      { usuario_id: "u1", midia_id: "m2" },
      { usuario_id: "u1", midia_id: "m4" },
    ]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationsService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    const svc = module.get<RecommendationsService>(RecommendationsService);

    const p1 = await svc.recomendarPorGenero("u1", { limit: 1 });
    expect(p1.recomendacoes.length).toBe(1);
    expect(p1.proximo_cursor).toBe(p1.recomendacoes[0].id);
    const p2 = await svc.recomendarPorGenero("u1", { limit: 1, cursor: p1.proximo_cursor });
    expect(p2.recomendacoes.length).toBe(1);
    expect(p2.recomendacoes[0].id).not.toBe(p1.recomendacoes[0].id);
  });

  it("PREMIUM — colaborativo agrega frequência de usuários com ≥3 itens em comum", async () => {
    // u1: a,b,c,d | u2: a,b,c + x,y | u3: a,b,c + x,z | u4: a,b (só 2 → fora)
    const ctx = makePrisma([
      { usuario_id: "u1", midia_id: "a" },
      { usuario_id: "u1", midia_id: "b" },
      { usuario_id: "u1", midia_id: "c" },
      { usuario_id: "u1", midia_id: "d" },
      { usuario_id: "u2", midia_id: "a" },
      { usuario_id: "u2", midia_id: "b" },
      { usuario_id: "u2", midia_id: "c" },
      { usuario_id: "u2", midia_id: "x" },
      { usuario_id: "u2", midia_id: "y" },
      { usuario_id: "u3", midia_id: "a" },
      { usuario_id: "u3", midia_id: "b" },
      { usuario_id: "u3", midia_id: "c" },
      { usuario_id: "u3", midia_id: "x" },
      { usuario_id: "u3", midia_id: "z" },
      { usuario_id: "u4", midia_id: "a" },
      { usuario_id: "u4", midia_id: "b" },
    ]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationsService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    const svc = module.get<RecommendationsService>(RecommendationsService);

    const r = await svc.colaborativo("u1", {});
    expect(r.recomendacoes.length).toBeGreaterThan(0);
    // x aparece para u2 e u3 (frequência 2) → primeiro.
    expect(r.recomendacoes[0].id).toBe("x");
    expect(r.recomendacoes[0].motivo).toContain("Popular entre usuários com gosto similar");
    // Nunca expõe a watchlist individual de outros usuários.
    const json = JSON.stringify(r);
    expect(json).not.toContain("u2");
    expect(json).not.toContain("u3");
    expect(json).not.toContain("u4");
  });

  it("PREMIUM — sem usuários similares (≤2 itens em comum) faz fallback para PLUS", async () => {
    const ctx = makePrisma([
      { usuario_id: "u1", midia_id: "m2" },
      { usuario_id: "u1", midia_id: "m3" },
      { usuario_id: "u2", midia_id: "m2" },
      { usuario_id: "u2", midia_id: "m3" }, // só 2 em comum → não é similar
    ]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationsService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    const svc = module.get<RecommendationsService>(RecommendationsService);

    const r = await svc.colaborativo("u1", {});
    expect(r.recomendacoes.length).toBeGreaterThan(0);
    expect(r.recomendacoes[0].motivo).toContain("Mesmo gênero");
  });

  it("PREMIUM — watchlist vazia retorna mensagem (mesmo contrato do PLUS)", async () => {
    const r = await service.colaborativo("u1", {});
    expect(r.recomendacoes).toEqual([]);
    expect(r.mensagem).toContain("Adicione itens à sua watchlist");
  });
});
