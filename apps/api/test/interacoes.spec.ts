/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InteracoesService } from "../src/modules/interacoes/interacoes.service.js";

function mockPrisma() {
  const estado: any[] = [];
  const prisma = {
    midia: {
      findUnique: vi.fn(async ({ where }: any) =>
        where.id === "midia-1" ? { id: "midia-1" } : null,
      ),
    },
    usuarioMidiaInteracao: {
      findUnique: vi.fn(async ({ where }: any) => {
        const k = where.usuario_id_midia_id;
        return (
          estado.find((e) => e.usuario_id === k.usuario_id && e.midia_id === k.midia_id) ?? null
        );
      }),
      findMany: vi.fn(async () => estado),
      // D-525: contrato paginado do listar (envelope com total/porStatus).
      count: vi.fn(async () => estado.length),
      groupBy: vi.fn(async () => []),
      upsert: vi.fn(async ({ create, update }: any) => {
        const k = create ? { usuario_id: create.usuario_id, midia_id: create.midia_id } : null;
        const idx = estado.findIndex(
          (e) => k && e.usuario_id === k.usuario_id && e.midia_id === k.midia_id,
        );
        if (idx >= 0) {
          estado[idx] = { ...estado[idx], ...update };
          return estado[idx];
        }
        const novo = { id: "u1", ...create };
        estado.push(novo);
        return novo;
      }),
    },
    // T286 — descobertas() consulta DiscoveryEvents além das interações.
    discoveryEvent: {
      findMany: vi.fn(async () => []),
    },
    // D-375: dual-write — status dirige a projeção do Kanban (upsert no mesmo tx).
    watchlistEntry: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const k = where.usuario_id_midia_id;
        const coluna = (update ?? create)?.coluna ?? "WANT";
        return { id: "w1", usuario_id: k.usuario_id, midia_id: k.midia_id, coluna };
      }),
    },
  };
  return { prisma, estado };
}

describe("T198 — interacoes.service (máquina de estados Addendum 4 Parte 3)", () => {
  let prisma: any;
  let service: InteracoesService;

  beforeEach(() => {
    ({ prisma } = mockPrisma());
    service = new InteracoesService(prisma);
  });

  it("cria interação QUERO_CONSUMIR quando não existe (1 toque)", async () => {
    const r = await service.upsert("user-1", "midia-1", {});
    expect(r.status).toBe("QUERO_CONSUMIR");
    expect(r.usuario_id).toBe("user-1");
  });

  it("QUERO_CONSUMIR → CONSUMINDO → CONCLUIDO + GOSTEI (fluxo completo)", async () => {
    await service.upsert("user-1", "midia-1", {});
    const r1 = await service.upsert("user-1", "midia-1", { status: "CONSUMINDO" });
    expect(r1.status).toBe("CONSUMINDO");
    expect(r1.iniciado_em).not.toBeNull();
    const r2 = await service.upsert("user-1", "midia-1", { status: "CONCLUIDO", reacao: "GOSTEI" });
    expect(r2.status).toBe("CONCLUIDO");
    expect(r2.reacao).toBe("GOSTEI");
    expect(r2.concluido_em).not.toBeNull();
  });

  it("QUERO_CONSUMIR → CONCLUIDO direto é válido (filme sem passar pela watchlist)", async () => {
    const r = await service.upsert("user-1", "midia-1", { status: "CONCLUIDO" });
    expect(r.status).toBe("CONCLUIDO");
  });

  it("reação em QUERO_CONSUMIR/CONSUMINDO → 400 (só após consumo real)", async () => {
    await expect(
      service.upsert("user-1", "midia-1", { status: "QUERO_CONSUMIR", reacao: "GOSTEI" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.upsert("user-1", "midia-1", { status: "CONSUMINDO" });
    await expect(
      service.upsert("user-1", "midia-1", { reacao: "NAO_GOSTEI" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("CONSUMINDO → QUERO_CONSUMIR é transição inválida → 400", async () => {
    await service.upsert("user-1", "midia-1", { status: "CONSUMINDO" });
    await expect(
      service.upsert("user-1", "midia-1", { status: "QUERO_CONSUMIR" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("motivo de abandono só é válido com status ABANDONADO → 400", async () => {
    await expect(
      service.upsert("user-1", "midia-1", { status: "CONCLUIDO", motivoAbandono: "FALTA_TEMPO" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("ABANDONADO com FALTA_TEMPO é aceito e não gera sinal negativo (motor)", async () => {
    const r = await service.upsert("user-1", "midia-1", {
      status: "ABANDONADO",
      motivoAbandono: "FALTA_TEMPO",
    });
    expect(r.status).toBe("ABANDONADO");
    expect(r.motivo_abandono).toBe("FALTA_TEMPO");
  });

  it("ABANDONADO direto de QUERO_CONSUMIR é válido (desistiu antes de começar)", async () => {
    await service.upsert("user-1", "midia-1", {});
    const r = await service.upsert("user-1", "midia-1", { status: "ABANDONADO" });
    expect(r.status).toBe("ABANDONADO");
  });

  it("reação explícita null limpa reação prévia", async () => {
    await service.upsert("user-1", "midia-1", { status: "CONCLUIDO", reacao: "GOSTEI" });
    const r = await service.upsert("user-1", "midia-1", { reacao: null });
    expect(r.reacao).toBeNull();
  });

  it("mídia inexistente → 404", async () => {
    await expect(service.upsert("user-1", "midia-inexistente", {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("listar retorna interações do usuário (envelope D-525)", async () => {
    await service.upsert("user-1", "midia-1", { status: "CONCLUIDO" });
    const pagina = await service.listar("user-1");
    expect(pagina.items).toHaveLength(1);
    expect(pagina.items[0]?.midia_id).toBe("midia-1");
    expect(pagina.total).toBe(1);
    expect(pagina.nextCursor).toBeNull();
    expect(pagina.porStatus).toHaveProperty("CONCLUIDO");
  });

  it("D-375 — mudar status cria/sincroniza a projeção do Kanban no mesmo tx", async () => {
    await service.upsert("user-1", "midia-1", { status: "CONSUMINDO" });
    expect(prisma.watchlistEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuario_id_midia_id: { usuario_id: "user-1", midia_id: "midia-1" },
        }),
        create: expect.objectContaining({ coluna: "WATCHING" }),
        update: { coluna: "WATCHING" },
      }),
    );
    // CONCLUIDO → COMPLETED.
    await service.upsert("user-1", "midia-1", { status: "CONCLUIDO" });
    expect(prisma.watchlistEntry.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ update: { coluna: "COMPLETED" } }),
    );
    // ABANDONADO → DROPPED (via CONSUMINDO, transição válida).
    await service.upsert("user-1", "midia-1", { status: "CONSUMINDO" });
    await service.upsert("user-1", "midia-1", { status: "ABANDONADO" });
    expect(prisma.watchlistEntry.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ update: { coluna: "DROPPED" } }),
    );
  });
});
