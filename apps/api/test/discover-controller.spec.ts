import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { DiscoverController } from "../src/modules/discover/discover.controller.js";
import { DiscoverService } from "../src/modules/discover/discover.service.js";

describe("DiscoverController (unit)", () => {
  let controller: DiscoverController;
  let service: any;

  beforeEach(async () => {
    service = {
      search: vi.fn(async () => ({ items: [], total: 0, limit: 20, offset: 0 })),
      discover: vi.fn(async () => ({
        items: [
          {
            id: "1",
            titulo: "Test",
            tipo: "FILME",
            ano_lancamento: 2024,
            sinopse: "",
            imagem_url: null,
            score: 85,
          },
        ],
        total: 1,
      })),
      trending: vi.fn(async () => ({ items: [], total: 0 })),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoverController],
      providers: [{ provide: DiscoverService, useValue: service }],
    }).compile();
    controller = module.get<DiscoverController>(DiscoverController);
  });

  it("GET /search — retorna resultados", async () => {
    const result = await controller.search({ q: "test" });
    expect(result.items).toBeDefined();
  });

  it("GET /discover — retorna mídias", async () => {
    const result = await controller.discover({});
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("GET /trending — retorna trending", async () => {
    const result = await controller.trending({});
    expect(result.items).toBeDefined();
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

  it("GET /search — aceita tipo válido e repassa ao service", async () => {
    await controller.search({ q: "test", tipo: "FILME" });
    expect(service.search).toHaveBeenCalledWith("test", {
      tipo: "FILME",
      limit: undefined,
      offset: undefined,
    });
  });
});
