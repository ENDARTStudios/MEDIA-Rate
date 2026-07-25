import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { WatchlistController } from "../src/modules/watchlist/watchlist.controller.js";
import { WatchlistService } from "../src/modules/watchlist/watchlist.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";
import type { FastifyRequest } from "fastify";

const mockAuthGuard: CanActivate = { canActivate: async () => true };

function mockReq(userId = "user-1") {
  return { user: { id: userId } } as unknown as FastifyRequest & { user: { id: string } };
}

describe("WatchlistController (unit)", () => {
  let controller: WatchlistController;
  let service: any;

  beforeEach(async () => {
    service = {
      list: async () => [],
      add: async (uid: string, dto: any) => ({ id: "entry-1", midia_id: dto.midia_id, coluna: dto.coluna ?? "WANT", midia: { id: dto.midia_id, titulo: "Test", tipo: "FILME", ano_lancamento: 2024, imagem_url: null } }),
      move: async () => ({ id: "entry-1", coluna: "COMPLETED" }),
      remove: async () => {},
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [{ provide: WatchlistService, useValue: service }],
    })
      .overrideGuard(AuthGuard).useValue(mockAuthGuard)
      .compile();
    controller = module.get<WatchlistController>(WatchlistController);
  });

  it("GET / — retorna lista vazia", async () => {
    const result = await controller.list(mockReq());
    expect(Array.isArray(result)).toBe(true);
  });

  it("POST / — adiciona mídia", async () => {
    const result = await controller.add(mockReq(), { midia_id: "m1", coluna: "WANT" });
    expect(result.midia_id).toBe("m1");
  });

  it("PATCH /:id/move — move coluna", async () => {
    const result = await controller.move(mockReq(), "entry-1", { coluna: "COMPLETED" });
    expect(result.coluna).toBe("COMPLETED");
  });

  it("DELETE /:id — retorna 204", async () => {
    await expect(controller.remove(mockReq(), "entry-1")).resolves.toBeUndefined();
  });
});
