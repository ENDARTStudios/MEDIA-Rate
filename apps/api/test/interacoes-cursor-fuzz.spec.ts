import { describe, it, expect, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { InteracoesService } from "../src/modules/interacoes/interacoes.service.js";

/**
 * T086/D-557 — fuzz/robustez do cursor de `GET /api/v1/interacoes`.
 *
 * Cursor opaco = offset em **base64url**. Nenhum cursor inválido/adulterado/
 * cruzado/excessivo pode causar 500, vazar interno ou ampliar escopo: deve
 * resultar em **400** (`BadRequestException`) — e o `skip` entregue ao Prisma
 * nunca pode ser negativo/não-seguro. Fixtures apenas sintéticas.
 */
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");

function mockPrisma() {
  const findMany = vi.fn(async () => []);
  const prisma = {
    usuarioMidiaInteracao: {
      findMany,
      count: vi.fn(async () => 0),
      groupBy: vi.fn(async () => []),
    },
    $transaction: undefined as never, // fallback do comContextoRls
  };
  return { prisma, findMany };
}

describe("T086 — fuzz/robustez do cursor de /interacoes", () => {
  it("cursor válido preserva o offset (regressão)", async () => {
    const { prisma, findMany } = mockPrisma();
    const svc = new InteracoesService(prisma as never);
    await svc.listar("u1", { cursor: b64("2"), limit: 1 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, where: { usuario_id: "u1" } }),
    );
  });

  const INVALIDOS: [string, string][] = [
    ["vazio", ""],
    ["espaços", "   "],
    ["não-base64", "!!!$$$"],
    ["base64 de '{'", b64("{")],
    ["base64 de 'abc'", b64("abc")],
    ["leniente '12abc'", b64("12abc")],
    ["negativo", b64("-5")],
    ["decimal", b64("1.5")],
    ["gigante (20 dígitos)", b64("99999999999999999999")],
    ["unicode árabe-indico", b64("٢")],
    ["SQL-like", b64("1; DROP TABLE x")],
    ["NoSQL-like", b64('{"$ne":null}')],
  ];

  for (const [nome, cursor] of INVALIDOS) {
    it(`cursor inválido (${nome}) → 400 e nunca chega ao Prisma`, async () => {
      const { prisma, findMany } = mockPrisma();
      const svc = new InteracoesService(prisma as never);
      await expect(svc.listar("u1", { cursor, limit: 1 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(findMany).not.toHaveBeenCalled();
    });
  }

  it("escopo owner-only: cursor de outro usuário não amplia a consulta", async () => {
    const { prisma, findMany } = mockPrisma();
    const svc = new InteracoesService(prisma as never);
    await svc.listar("uA", { cursor: b64("0"), limit: 1 });
    const arg = findMany.mock.calls[0]?.[0] as { where?: { usuario_id?: string }; skip?: number };
    expect(arg.where?.usuario_id).toBe("uA");
    expect(Number.isSafeInteger(arg.skip)).toBe(true);
    expect((arg.skip ?? -1) >= 0).toBe(true);
  });
});
