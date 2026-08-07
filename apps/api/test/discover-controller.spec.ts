import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { DiscoverController } from "../src/modules/discover/discover.controller.js";
import { DiscoverService } from "../src/modules/discover/discover.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";

interface MockDiscoverService {
  search: Mock<
    (
      q: string,
      filters: { tipo?: string; limit?: number; offset?: number },
    ) => Promise<{ items: unknown[]; total: number; limit: number; offset: number }>
  >;
  discover: Mock<
    (
      filters: Record<string, unknown>,
    ) => Promise<{ itens: unknown[]; proximo_cursor: string | null; total_estimado: number }>
  >;
  trending: Mock<
    (filters: {
      limit?: number;
    }) => Promise<{ itens: unknown[]; proximo_cursor: string | null; total_estimado: number }>
  >;
}

const mockSession: Partial<SessionService> = {
  validateToken: async () => null,
};

function mockReq(cookies: Record<string, string> = {}): FastifyRequest {
  return { cookies } as unknown as FastifyRequest;
}

describe("DiscoverController (unit)", () => {
  let controller: DiscoverController;
  let service: MockDiscoverService;

  beforeEach(async () => {
    service = {
      search: vi.fn(async () => ({ items: [], total: 0, limit: 20, offset: 0 })),
      discover: vi.fn(async () => ({
        itens: [
          {
            id: "1",
            titulo: "Test",
            tipo: "FILME",
            ano: 2024,
            poster_url: null,
            score: 85,
            na_watchlist: false,
            slug: "test",
          },
        ],
        proximo_cursor: null,
        total_estimado: 1,
      })),
      trending: vi.fn(async () => ({ itens: [], proximo_cursor: null, total_estimado: 0 })),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoverController],
      providers: [
        { provide: DiscoverService, useValue: service },
        { provide: SessionService, useValue: mockSession },
      ],
    }).compile();
    controller = module.get<DiscoverController>(DiscoverController);
  });

  it("GET /search — retorna resultados", async () => {
    const result = await controller.search({ q: "test" });
    expect(result.items).toBeDefined();
  });

  it("GET /discover — repassa query completa e usuarioId nullo sem sessão", async () => {
    const result = await controller.discover(mockReq(), { q: "matrix", tipo: "FILME" });
    expect(result.itens.length).toBeGreaterThan(0);
    expect(service.discover).toHaveBeenCalledWith(
      expect.objectContaining({ q: "matrix", tipo: "FILME", usuarioId: null }),
    );
  });

  it("GET /discover — com sessão válida repassa usuarioId", async () => {
    const session = {
      validateToken: async () => ({
        sessao: { usuario_id: "user-1" },
        usuario: { id: "user-1" },
      }),
    } as Partial<SessionService>;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoverController],
      providers: [
        { provide: DiscoverService, useValue: service },
        { provide: SessionService, useValue: session },
      ],
    }).compile();
    const ctrl = module.get<DiscoverController>(DiscoverController);
    await ctrl.discover(mockReq({ sess: "token" }), { q: "matrix" });
    expect(service.discover).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: "user-1" }));
  });

  it("GET /discover — sessão inválida degrada para anônimo (nunca 401)", async () => {
    const session = {
      validateToken: async () => {
        throw new Error("sessão inválida");
      },
    } as Partial<SessionService>;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoverController],
      providers: [
        { provide: DiscoverService, useValue: service },
        { provide: SessionService, useValue: session },
      ],
    }).compile();
    const ctrl = module.get<DiscoverController>(DiscoverController);
    const result = await ctrl.discover(mockReq({ sess: "token-velho" }), { q: "matrix" });
    expect(result.itens.length).toBeGreaterThan(0);
    expect(service.discover).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: null }));
  });

  it("GET /trending — retorna trending", async () => {
    const result = await controller.trending({});
    expect(result.itens).toBeDefined();
  });

  it("GET /search — rejeita tipo inválido (SQLi) com 400", async () => {
    const injections = [
      "' OR 1=1 --",
      '\'; DROP TABLE "Midia"; --',
      '1 UNION SELECT * FROM "Usuario"',
      'Robert\'); DROP TABLE "Midia";--',
      "' OR '1'='1",
      "admin'--",
      '1; DELETE FROM "Usuario" WHERE 1=1',
    ];
    for (const tipo of injections) {
      await expect(controller.search({ q: "test", tipo })).rejects.toThrow(BadRequestException);
    }
    expect(service.search).not.toHaveBeenCalled();
  });

  it("GET /search — rejeita q ausente ou muito longo", async () => {
    await expect(controller.search({})).rejects.toThrow(BadRequestException);
    await expect(controller.search({ q: "a".repeat(201) })).rejects.toThrow(BadRequestException);
  });

  it("GET /discover — rejeita q muito longo (201 chars)", async () => {
    await expect(controller.discover(mockReq(), { q: "a".repeat(201) })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("GET /discover — rejeita cursor não-UUID", async () => {
    await expect(controller.discover(mockReq(), { cursor: "nao-uuid" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("GET /search — aceita tipo válido e repassa ao service", async () => {
    await controller.search({ q: "test", tipo: "FILME" });
    expect(service.search).toHaveBeenCalledWith("test", {
      tipo: "FILME",
      limit: undefined,
      offset: undefined,
    });
  });
});
