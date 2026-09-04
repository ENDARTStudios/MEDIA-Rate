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
});
