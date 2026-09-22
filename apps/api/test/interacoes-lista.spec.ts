/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { InteracoesService } from "../src/modules/interacoes/interacoes.service.js";
import { listInteracoesQuerySchema } from "../src/modules/interacoes/interacoes.dto.js";

/**
 * D-525 — contrato do GET /api/v1/interacoes (fonte da biblioteca):
 * paginação por cursor opaco, filtros por status/tipo, teto de limit e
 * contagens porStatus. RLS owner-only garantido pelo comContextoRls.
 */

const INTERACAO = (i: number) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  midia_id: `m${i}`,
  status: i % 2 === 0 ? "CONCLUIDO" : "QUERO_CONSUMIR",
  // D-525: fetchAll do store lê reacao/motivo_abandono do payload.
  // T036/D-536: a resposta é ALLOWLIST — reacao/motivo preservados; colunas
  // internas/legadas descartadas pelo mapper.
  reacao: i % 2 === 0 ? "GOSTEI" : null,
  motivo_abandono: null,
  atualizado_em: new Date(2026, 8, i + 1),
  // Colunas internas/legadas — NÃO devem aparecer na resposta:
  usuario_id: "u1",
  tenant_id: "00000000-0000-0000-0000-000000000001",
  tipo: "consumo",
  rating: 5,
  comentario: "legado",
  created_at: new Date(2026, 0, 1),
  midia: {
    id: `m${i}`,
    slug: `titulo-${i}`,
    titulo: `Título ${i}`,
    tipo: "FILME",
    ano_lancamento: 2024,
    imagem_url: null,
    score: 80,
  },
});

function mockPrisma({
  itens,
  total,
  porStatus,
}: {
  itens: any[];
  total: number;
  porStatus: any[];
}) {
  return {
    usuarioMidiaInteracao: {
      findMany: vi.fn(async () => itens),
      count: vi.fn(async () => total),
      groupBy: vi.fn(async () => porStatus),
    },
    $transaction: undefined as never, // aciona o fallback do comContextoRls
  };
}

describe("InteracoesService.listar (D-525)", () => {
  it("sem query → página default (limit 50, cursor 0) com envelope completo", async () => {
    const prisma = mockPrisma({
      itens: [INTERACAO(1), INTERACAO(2)],
      total: 2,
      porStatus: [
        { status: "CONCLUIDO", _count: { _all: 1 } },
        { status: "QUERO_CONSUMIR", _count: { _all: 1 } },
      ],
    });
    const svc = new InteracoesService(prisma as any);
    const r = await svc.listar("u1");
    expect(r.items).toHaveLength(2);
    expect(r.total).toBe(2);
    expect(r.nextCursor).toBeNull();
    expect(r.porStatus).toEqual({
      QUERO_CONSUMIR: 1,
      CONSUMINDO: 0,
      CONCLUIDO: 1,
      ABANDONADO: 0,
    });
    expect(r.items[0]?.midia.slug).toBe("titulo-1");
    expect(r.items[0]?.reacao).toBeNull(); // QUERO_CONSUMIR não tem reação
    expect(r.items[1]?.reacao).toBe("GOSTEI"); // preservado (fetchAll consome)
    // T036/D-536: contrato público — colunas internas/legadas NÃO vazam
    const item0 = r.items[0] as unknown as Record<string, unknown>;
    for (const k of ["usuario_id", "tenant_id", "tipo", "rating", "comentario", "created_at"]) {
      expect(item0).not.toHaveProperty(k);
    }
    // where só do dono (RLS aplica o contexto)
    expect(prisma.usuarioMidiaInteracao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuario_id: "u1" }, take: 50, skip: 0 }),
    );
  });

  it("filtros status/tipo chegam no where (e porStatus continua global)", async () => {
    const prisma = mockPrisma({ itens: [INTERACAO(2)], total: 1, porStatus: [] });
    const svc = new InteracoesService(prisma as any);
    await svc.listar("u1", { status: "CONCLUIDO", tipo: "FILME" });
    expect(prisma.usuarioMidiaInteracao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuario_id: "u1", status: "CONCLUIDO", midia: { tipo: "FILME" } },
      }),
    );
    expect(prisma.usuarioMidiaInteracao.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuario_id: "u1" } }),
    );
  });

  it("cursor opaco avança a página; página curta encerra a paginação", async () => {
    const itens = Array.from({ length: 2 }, (_, i) => INTERACAO(i + 1));
    const prisma = mockPrisma({ itens, total: 5, porStatus: [] });
    const svc = new InteracoesService(prisma as any);
    const r = await svc.listar("u1", { limit: 2 });
    expect(r.items).toHaveLength(2); // página cheia
    const cursor1 = r.nextCursor;
    expect(cursor1).not.toBeNull();
    // página 2 cheia → ainda há cursor
    const prisma2 = mockPrisma({ itens: [INTERACAO(3), INTERACAO(4)], total: 5, porStatus: [] });
    const pagina2 = new InteracoesService(prisma2 as any);
    const r2 = await pagina2.listar("u1", { limit: 2, cursor: cursor1 ?? "" });
    expect(prisma2.usuarioMidiaInteracao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, take: 2 }),
    );
    const cursor2 = r2.nextCursor;
    expect(cursor2).not.toBeNull();
    // página 3 curta (1 item < limit) → última, sem cursor
    const prisma3 = mockPrisma({ itens: [INTERACAO(5)], total: 5, porStatus: [] });
    const ultima = new InteracoesService(prisma3 as any);
    const r3 = await ultima.listar("u1", { limit: 2, cursor: cursor2 ?? "" });
    expect(r3.items).toHaveLength(1);
    expect(r3.nextCursor).toBeNull();
  });

  it("cursor inválido → 400 (BadRequest), nunca 500", async () => {
    const prisma = mockPrisma({ itens: [], total: 0, porStatus: [] });
    const svc = new InteracoesService(prisma as any);
    await expect(svc.listar("u1", { cursor: "!!@nao-base64url-int@" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("mapeia porStatus zerado quando o usuário não tem interações", async () => {
    const prisma = mockPrisma({ itens: [], total: 0, porStatus: [] });
    const svc = new InteracoesService(prisma as any);
    const r = await svc.listar("u1");
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
    expect(r.nextCursor).toBeNull();
    expect(r.porStatus).toEqual({
      QUERO_CONSUMIR: 0,
      CONSUMINDO: 0,
      CONCLUIDO: 0,
      ABANDONADO: 0,
    });
  });
});

describe("listInteracoesQuerySchema (D-525)", () => {
  it("valida status/tipo contra enums e limit 1-50", () => {
    expect(listInteracoesQuerySchema.safeParse({}).success).toBe(true);
    expect(listInteracoesQuerySchema.safeParse({ status: "CONCLUIDO", limit: "25" }).success).toBe(
      true,
    );
    expect(listInteracoesQuerySchema.safeParse({ status: "ASSISTIDO" }).success).toBe(false);
    expect(listInteracoesQuerySchema.safeParse({ tipo: "ANIME" }).success).toBe(false);
    expect(listInteracoesQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(listInteracoesQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(listInteracoesQuerySchema.safeParse({ limit: 1.5 }).success).toBe(false);
  });

  it("limit chega como número (coerce de query string)", () => {
    const r = listInteracoesQuerySchema.parse({ limit: "10" });
    expect(r.limit).toBe(10);
  });
});
