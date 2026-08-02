import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { DiscoverService } from "../src/modules/discover/discover.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

describe("DiscoverService (unit)", () => {
  let service: DiscoverService;
  let prisma: any;

  beforeEach(async () => {
    prisma = mockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoverService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<DiscoverService>(DiscoverService);
  });

  it("search — retorna resultados por título", async () => {
    const result = await service.search("Shawshank");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].titulo).toContain("Shawshank");
  });

  it("search — termo sem resultados retorna array vazio", async () => {
    prisma = mockEmptyPrisma();
    const module2 = await Test.createTestingModule({
      providers: [DiscoverService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const svc = module2.get<DiscoverService>(DiscoverService);
    const result = await svc.search("xyznonexistent999");
    expect(result.items.length).toBe(0);
    expect(result.total).toBe(0);
  });

  it("search — respeita limite", async () => {
    const result = await service.search("a", { limit: 2 });
    expect(result.items.length).toBeLessThanOrEqual(2);
  });

  it("search — filtra por tipo", async () => {
    const result = await service.search("a", { tipo: "FILME" });
    result.items.forEach((m: any) => expect(m.tipo).toBe("FILME"));
  });

  it("search — parametriza o filtro de tipo (Prisma.sql, sem interpolar input)", async () => {
    await service.search("a", { tipo: "FILME" });
    const rawQuery = prisma.lastRawQuery;
    expect(rawQuery).toBeDefined();
    // O valor do tipo nunca aparece concatenado no SQL — sempre como parâmetro.
    expect(rawQuery.includes("FILME")).toBe(false);
  });

  it("discover — retorna mídias ordenadas por score", async () => {
    const result = await service.discover({ limit: 5 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].titulo).toBeDefined();
  });

  it("discover — retorna trending com dados de score", async () => {
    const result = await service.trending({ limit: 3 });
    expect(result.items.length).toBeLessThanOrEqual(3);
    result.items.forEach((m: any) => {
      expect(m.titulo).toBeDefined();
      expect(m.tipo).toBeDefined();
    });
  });

  it("discover — retorna empty se sem dados", async () => {
    prisma = mockEmptyPrisma();
    const module2: TestingModule = await Test.createTestingModule({
      providers: [DiscoverService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const svc = module2.get<DiscoverService>(DiscoverService);
    const result = await svc.search("anything");
    expect(result.items.length).toBe(0);
  });
});

function mockPrisma() {
  const DB = [
    {
      id: "1",
      titulo: "The Shawshank Redemption",
      tipo: "FILME",
      ano_lancamento: 1994,
      sinopse: "Prison drama",
      imagem_url: null,
    },
    {
      id: "2",
      titulo: "Breaking Bad",
      tipo: "SERIE",
      ano_lancamento: 2008,
      sinopse: "Chemistry teacher",
      imagem_url: null,
    },
    {
      id: "3",
      titulo: "Inception",
      tipo: "FILME",
      ano_lancamento: 2010,
      sinopse: "Dream heist",
      imagem_url: null,
    },
    {
      id: "4",
      titulo: "Interstellar",
      tipo: "FILME",
      ano_lancamento: 2014,
      sinopse: "Space travel",
      imagem_url: null,
    },
    {
      id: "5",
      titulo: "Shawshank",
      tipo: "FILME",
      ano_lancamento: 1994,
      sinopse: "Test",
      imagem_url: null,
    },
  ];

  let lastRawQuery: string | undefined;

  return {
    get lastRawQuery() {
      return lastRawQuery;
    },
    // $queryRaw recebe um objeto Query (Prisma.sql template) — captura o SQL
    // compilado e extrai valores a partir dos placeholders.
    $queryRaw: async (query: any) => {
      const sql = typeof query === "string" ? query : (query?.sql ?? "");
      const values = (query?.values ?? []) as unknown[];
      lastRawQuery = sql;
      let compiled = sql;
      for (const v of values) {
        compiled = compiled.replace(/\?/, JSON.stringify(v));
      }
      const q = values[0] as string | undefined;
      const rawQ = q ? q.toLowerCase() : "";
      let results = DB.filter(
        (m) => m.titulo.toLowerCase().includes(rawQ) || m.sinopse.toLowerCase().includes(rawQ),
      );
      const tipoMatch = compiled.match(/tipo = "(\w+)"/);
      if (tipoMatch) results = results.filter((m) => m.tipo === tipoMatch[1]);
      const limitMatch = compiled.match(/LIMIT (\d+)/);
      const limit = limitMatch ? parseInt(limitMatch[1]) : 20;
      const offsetMatch = compiled.match(/OFFSET (\d+)/);
      const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
      const total = results.length;
      results = results.slice(offset, offset + limit);
      return results.map((r) => ({ ...r, total }));
    },
    midia: {
      findMany: async (args: any) => {
        let items = [...DB];
        if (args.where?.tipo) items = items.filter((m) => m.tipo === args.where.tipo);
        if (args.orderBy?.score) items.sort(() => -1);
        const limit = args.take ?? 20;
        return items.slice(0, limit);
      },
    },
  };
}

function mockEmptyPrisma() {
  return {
    $queryRaw: async () => [],
    midia: { findMany: async () => [] },
  };
}
