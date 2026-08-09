/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DiscoverService } from "../src/modules/discover/discover.service.js";

function mockPrisma() {
  const generos = new Map<string, any>();
  const midias: any[] = [];
  const prisma = {
    genero: {
      findUnique: vi.fn(async ({ where }: any) => generos.get(where.slug) ?? null),
    },
    midia: {
      findMany: vi.fn(async (args: any) => {
        const alvo = args?.where?.tipo;
        return midias.filter((m) => (alvo ? m.tipo === alvo : true)).map((m) => ({ ...m }));
      }),
    },
  };
  return { prisma, generos, midias };
}

describe("T198 — catalog por gênero (Addendum 2 Parte 4 + 3 Parte 3)", () => {
  let prisma: any;
  let generos: Map<string, any>;
  let midias: any[];
  let service: DiscoverService;

  beforeEach(() => {
    ({ prisma, generos, midias } = mockPrisma());
    service = new DiscoverService(prisma);
  });

  it("gênero NARRATIVO filtra cross-mídia (filmes + séries + games juntos)", async () => {
    generos.set("acao", { id: 1, slug: "acao", nome: "Ação", tipo: "NARRATIVO", midia_alvo: null });
    midias.push(
      { id: "f1", tipo: "FILME", score: 91, scores: [{ score: 91 }] },
      { id: "s1", tipo: "SERIE", score: 85, scores: [{ score: 85 }] },
      { id: "g1", tipo: "GAME", score: 88, scores: [{ score: 88 }] },
    );
    const r = await service.listarPorGenero("acao", {});
    expect(r.genero.tipo).toBe("NARRATIVO");
    expect(r.genero.midiaAlvo).toBeNull();
    expect(r.items.map((i: any) => i.tipo).sort()).toEqual(["FILME", "GAME", "SERIE"]);
    // Ordenado por score desc.
    expect(r.items[0].id).toBe("f1");
  });

  it("gênero SUBGENERO restringe ao midia_alvo (RPG → só GAME)", async () => {
    generos.set("rpg", { id: 2, slug: "rpg", nome: "RPG", tipo: "SUBGENERO", midia_alvo: "GAME" });
    midias.push(
      { id: "g1", tipo: "GAME", score: 90, scores: [{ score: 90 }] },
      { id: "f1", tipo: "FILME", score: 95, scores: [{ score: 95 }] },
    );
    const r = await service.listarPorGenero("rpg", {});
    expect(r.items.length).toBe(1);
    expect(r.items[0].tipo).toBe("GAME");
  });

  it("subgênero Shonen → só MANGA (D-233/T231: mangá é categoria própria)", async () => {
    generos.set("shonen", {
      id: 3,
      slug: "shonen",
      nome: "Shonen",
      tipo: "SUBGENERO",
      midia_alvo: "MANGA",
    });
    midias.push(
      { id: "a1", tipo: "MANGA", score: 80, scores: [{ score: 80 }] },
      { id: "g1", tipo: "GAME", score: 90, scores: [{ score: 90 }] },
    );
    const r = await service.listarPorGenero("shonen", {});
    expect(r.items.length).toBe(1);
    expect(r.items[0].tipo).toBe("MANGA");
  });

  it("gênero inexistente → genero null e lista vazia (graceful)", async () => {
    const r = await service.listarPorGenero("nao-existe", {});
    expect(r.genero).toBeNull();
    expect(r.items.length).toBe(0);
  });
});
