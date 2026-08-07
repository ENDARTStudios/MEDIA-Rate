import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { CanActivate, BadRequestException } from "@nestjs/common";
import { WatchlistController } from "../src/modules/watchlist/watchlist.controller.js";
import { WatchlistService } from "../src/modules/watchlist/watchlist.service.js";
import { MetricsService } from "../src/modules/metrics/metrics.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";
import { FastifyRequest } from "fastify";

interface MockWatchlistService {
  list: (usuarioId: string, coluna?: string) => Promise<unknown[]>;
  add: (
    usuarioId: string,
    dto: { midia_id: string; coluna?: string },
  ) => Promise<{
    id: string;
    midia_id: string;
    coluna: string;
    midia: Record<string, unknown>;
  }>;
  move: (usuarioId: string, id: string, coluna: string) => Promise<{ id: string; coluna: string }>;
  remove: (usuarioId: string, id: string) => Promise<void>;
}

const mockAuthGuard: CanActivate = { canActivate: async () => true };

function mockReq(userId = "user-1") {
  return { user: { id: userId } } as unknown as FastifyRequest & { user: { id: string } };
}

describe("WatchlistController (unit)", () => {
  let controller: WatchlistController;
  let service: MockWatchlistService;

  beforeEach(async () => {
    service = {
      list: async () => [],
      add: async (uid: string, dto: { midia_id: string; coluna?: string }) => ({
        id: "entry-1",
        midia_id: dto.midia_id,
        coluna: dto.coluna ?? "WANT",
        midia: {
          id: dto.midia_id,
          titulo: "Test",
          tipo: "FILME",
          ano_lancamento: 2024,
          imagem_url: null,
        },
      }),
      move: async () => ({ id: "entry-1", coluna: "COMPLETED" }),
      remove: async () => {
        /* stub de teste */
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [
        { provide: WatchlistService, useValue: service },
        {
          provide: MetricsService,
          useValue: {
            incrementWatchlistAdd: () => {
              /* stub de teste */
            },
            incrementWatchlistMove: () => {
              /* stub de teste */
            },
            incrementWatchlistRemove: () => {
              /* stub de teste */
            },
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();
    controller = module.get<WatchlistController>(WatchlistController);
  });

  it("GET / — retorna lista vazia", async () => {
    const result = await controller.list(mockReq());
    expect(Array.isArray(result)).toBe(true);
  });

  it("GET /?coluna=WANT — repassa o filtro de coluna ao service", async () => {
    const listSpy = vi.spyOn(service, "list").mockResolvedValue([]);
    await controller.list(mockReq(), "WANT");
    expect(listSpy).toHaveBeenCalledWith("user-1", "WANT");
    listSpy.mockRestore();
  });

  it("GET /?coluna=INVALIDA — lança BadRequestException", async () => {
    await expect(controller.list(mockReq(), "INVALIDA")).rejects.toThrow(BadRequestException);
  });

  it("POST / — adiciona mídia", async () => {
    const result = await controller.add(mockReq(), { midia_id: "m1", coluna: "WANT" });
    expect(result.midia_id).toBe("m1");
  });

  it("PATCH /:id/move — move coluna", async () => {
    const req = {
      user: { id: "user-1" },
      body: { coluna: "COMPLETED" },
    } as unknown as FastifyRequest & { user: { id: string }; body?: { coluna?: string } };
    const result = await controller.move(req, "entry-1");
    expect(result.coluna).toBe("COMPLETED");
  });

  it("DELETE /:id — retorna 204", async () => {
    await expect(controller.remove(mockReq(), "entry-1")).resolves.toBeUndefined();
  });
});
