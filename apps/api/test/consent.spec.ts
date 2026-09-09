import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsentService } from "../src/modules/consent/consent.service.js";
import { HttpException } from "@nestjs/common";

const USUARIO = "u-1";

function buildMock() {
  const create = vi.fn(async () => ({ id: "cl-1" }));
  const findMany = vi.fn(async () => [{ id: "cl-1", versao: "1" }]);
  const prisma = {
    consentLog: {
      create,
      findMany,
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return { prisma, create, findMany };
}

function input(over = {}) {
  return {
    categorias: { analytics: true, monitoring: false, necessary: true },
    versao: "1",
    ts: 1700000000,
    idioma: "pt-BR",
    pais: "BR",
    ...over,
  };
}

describe("ConsentService (T443) — trilha append-only + owner-only", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registrar: APENAS create (append-only — nenhum update/delete)", async () => {
    const { prisma, create } = buildMock();
    const svc = new ConsentService(prisma as never);
    const r = await svc.registrar(USUARIO, input(), "127.0.0.1");
    expect(r.registrado).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    // append-only: nada de update/delete/deleteMany/updateMany
    expect(prisma.consentLog.update).not.toHaveBeenCalled();
    expect(prisma.consentLog.delete).not.toHaveBeenCalled();
    expect(prisma.consentLog.deleteMany).not.toHaveBeenCalled();
    expect(prisma.consentLog.updateMany).not.toHaveBeenCalled();
    // payload registrado com versao/idioma/pais
    const data = create.mock.calls[0][0].data;
    expect(data.versao).toBe("1");
    expect(data.idioma).toBe("pt-BR");
    expect(data.pais).toBe("BR");
  });

  it("historico: consulta OWNER-ONLY pelo usuario_id", async () => {
    const { prisma, findMany } = buildMock();
    const svc = new ConsentService(prisma as never);
    await svc.historico(USUARIO);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuario_id: USUARIO } }),
    );
  });

  it("rate limit: dispara 429 após 5 registros na janela", async () => {
    const { prisma } = buildMock();
    const svc = new ConsentService(prisma as never);
    for (let i = 0; i < 5; i++) await svc.registrar(USUARIO, input({ ts: 1700000000 + i }));
    await expect(svc.registrar(USUARIO, input({ ts: 1700000000 + 99 }))).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it("T449/D-447 regressão: historico serializa com ts BigInt REAL do driver (sem 500)", async () => {
    // O driver Postgres devolve bigint como BigInt — o mock antigo retornava
    // Number e escondia o 500 do JSON.stringify em produção.
    const { prisma } = buildMock();
    prisma.consentLog.findMany.mockResolvedValue([
      {
        id: "cl-1",
        usuario_id: USUARIO,
        categorias: { analytics: true, monitoring: false },
        versao: "1",
        ts: BigInt(1700000000000),
        idioma: "pt-BR",
        pais: "BR",
        device_hash: null,
        ip_hash: "abc",
        criado_em: new Date("2026-09-09T00:00:00Z"),
      },
    ]);
    const svc = new ConsentService(prisma as never);
    const historico = await svc.historico(USUARIO);
    let serializado = "";
    expect(() => {
      serializado = JSON.stringify(historico);
    }).not.toThrow();
    expect(serializado).toContain("1700000000000");
  });
});
