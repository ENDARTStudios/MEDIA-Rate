import { describe, it, expect, vi } from "vitest";
import { HttpException, NotFoundException } from "@nestjs/common";
import { ListasService } from "../src/modules/listas/listas.service.js";

function mockPrisma() {
  const listas: Record<string, { id: string; dono_id: string; slug: string; titulo: string }> = {
    "lista-1": { id: "lista-1", dono_id: "user-1", slug: "top-terror", titulo: "Top Terror" },
  };
  return {
    listaColaborativa: {
      findUnique: vi.fn(async ({ where }: { where: { slug?: string; id?: string } }) => {
        if (where.slug) {
          return Object.values(listas).find((l) => l.slug === where.slug) ?? null;
        }
        return listas[where.id as string] ?? null;
      }),
      findMany: vi.fn(async () =>
        Object.values(listas).map((l) => ({ ...l, _count: { itens: 0 } })),
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "nova",
        ...data,
      })),
      update: vi.fn(async () => ({
        id: "lista-1",
        titulo: "Novo",
        descricao: null,
        slug: "top-terror",
      })),
      delete: vi.fn(async () => ({})),
    },
    listaItem: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "item-1",
        ...data,
      })),
      delete: vi.fn(async () => ({})),
    },
    midia: {
      findMany: vi.fn(async () => []),
    },
    usuario: { findUnique: vi.fn() },
  };
}

describe("ListasService — listas colaborativas (D-132)", () => {
  it("criar com plano FREE → 402 com upsell PREMIUM", async () => {
    const prisma = mockPrisma();
    const quota = { planoDe: vi.fn().mockResolvedValue("FREE") };
    const service = new ListasService(prisma as never, quota as never);
    const err = await service
      .criar("user-1", { titulo: "Top Terror" })
      .catch((e: HttpException) => e);
    expect(err.getStatus()).toBe(402);
    expect((err.getResponse() as { required_plan: string }).required_plan).toBe("PREMIUM");
    expect(prisma.listaColaborativa.create).not.toHaveBeenCalled();
  });

  it("criar com Premium gera slug a partir do título", async () => {
    const prisma = mockPrisma();
    const quota = { planoDe: vi.fn().mockResolvedValue("PREMIUM") };
    const service = new ListasService(prisma as never, quota as never);
    const result = await service.criar("user-1", { titulo: "Minha Lista" });
    expect(result.slug).toBe("minha-lista");
    expect(result.dono_id).toBe("user-1");
  });

  it("slug colide → sufixo numérico", async () => {
    const prisma = mockPrisma();
    const quota = { planoDe: vi.fn().mockResolvedValue("PREMIUM") };
    const service = new ListasService(prisma as never, quota as never);
    prisma.listaColaborativa.findUnique
      .mockResolvedValueOnce({ id: "x", dono_id: "y", slug: "top-terror", titulo: "t" })
      .mockResolvedValueOnce(null);
    const result = await service.criar("user-1", { titulo: "Top Terror" });
    expect(result.slug).toBe("top-terror-2");
  });

  it("obterPorSlug com slug inexistente → 404", async () => {
    const prisma = mockPrisma();
    const service = new ListasService(prisma as never, {} as never);
    await expect(service.obterPorSlug("nao-existe")).rejects.toThrow(NotFoundException);
  });

  it("adicionarItem duplicado → Conflict", async () => {
    const prisma = mockPrisma();
    const service = new ListasService(prisma as never, {} as never);
    prisma.listaItem.findUnique.mockResolvedValueOnce({ id: "dup" } as never);
    const err = await service
      .adicionarItem("user-2", "top-terror", { midia_id: "m1" })
      .catch((e: HttpException) => e);
    expect(err.getStatus()).toBe(409);
  });

  it("editar de não-dono → Forbidden", async () => {
    const prisma = mockPrisma();
    const service = new ListasService(prisma as never, {} as never);
    await expect(service.editar("user-2", "top-terror", { titulo: "X" })).rejects.toThrow(/dono/);
  });

  it("adicionarItem de qualquer usuário logado funciona", async () => {
    const prisma = mockPrisma();
    const service = new ListasService(prisma as never, {} as never);
    const result = await service.adicionarItem("user-2", "top-terror", {
      midia_id: "m1",
      observacao: "clássico",
    });
    expect(result.lista_id).toBe("lista-1");
    expect(result.adicionado_por).toBe("user-2");
    expect(result.observacao).toBe("clássico");
  });
});
