import { describe, it, expect, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { WatchlistService } from "../src/modules/watchlist/watchlist.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";

/**
 * D-528/T027 — o move() do Kanban projeta o status na interação
 * (usuarioMidiaInteracao) e por isso DEVE respeitar a mesma máquina de
 * estados do PUT /interacoes: CONCLUIDO → ABANDONADO é proibido.
 * Ações críticas (move) registram AuditLog (repudiação).
 */

const USER = "u1";
const ENTRY = "entry-1";
const MIDIA_UUID = "11111111-1111-4111-8111-111111111111";

function mockPrisma(statusAtual: string | null) {
  return {
    prisma: {
      watchlistEntry: {
        findFirst: vi.fn(async () => ({
          id: ENTRY,
          usuario_id: USER,
          midia_id: MIDIA_UUID,
          coluna: "COMPLETED",
        })),
        update: vi.fn(async ({ data }: { data: { coluna: string } }) => ({
          id: ENTRY,
          coluna: data.coluna,
        })),
      },
      usuarioMidiaInteracao: {
        findUnique: vi.fn(async () => (statusAtual ? { status: statusAtual } : null)),
        upsert: vi.fn(async () => ({})),
      },
    },
    audit: vi.fn(async () => undefined),
  };
}

async function build(mock: ReturnType<typeof mockPrisma>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      WatchlistService,
      { provide: PrismaService, useValue: mock.prisma },
      { provide: AuditLogService, useValue: { log: mock.audit } },
    ],
  }).compile();
  return module.get<WatchlistService>(WatchlistService);
}

describe("watchlist.move — máquina de estados D-528 + audit", () => {
  it("COMPLETED → DROPPED (CONCLUIDO → ABANDONADO) é rejeitado com 400", async () => {
    const mock = mockPrisma("CONCLUIDO");
    const service = await build(mock);
    await expect(service.move(USER, ENTRY, "DROPPED")).rejects.toBeInstanceOf(BadRequestException);
    expect(mock.prisma.usuarioMidiaInteracao.upsert).not.toHaveBeenCalled();
  });

  it("CONSUMINDO → DROPPED é permitido (transição válida)", async () => {
    const mock = mockPrisma("CONSUMINDO");
    const service = await build(mock);
    await service.move(USER, ENTRY, "DROPPED");
    expect(mock.prisma.usuarioMidiaInteracao.upsert).toHaveBeenCalled();
  });

  it("move registra AuditLog (repudiação)", async () => {
    const mock = mockPrisma("CONSUMINDO");
    const service = await build(mock);
    await service.move(USER, ENTRY, "DROPPED");
    expect(mock.audit).toHaveBeenCalled();
  });

  it("sem interação prévia: create é permitido (máquina parte de null)", async () => {
    const mock = mockPrisma(null);
    const service = await build(mock);
    await service.move(USER, ENTRY, "DROPPED");
    expect(mock.prisma.usuarioMidiaInteracao.upsert).toHaveBeenCalled();
  });
});
