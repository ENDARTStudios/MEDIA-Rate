import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { DiscoverController } from "../src/modules/discover/discover.controller.js";
import { DiscoverService } from "../src/modules/discover/discover.service.js";

describe("DiscoverController (unit)", () => {
  let controller: DiscoverController;
  let service: any;

  beforeEach(async () => {
    service = {
      search: async () => ({ items: [], total: 0, limit: 20, offset: 0 }),
      discover: async () => ({ items: [{ id: "1", titulo: "Test", tipo: "FILME", ano_lancamento: 2024, sinopse: "", imagem_url: null, score: 85 }], total: 1 }),
      trending: async () => ({ items: [], total: 0 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoverController],
      providers: [{ provide: DiscoverService, useValue: service }],
    }).compile();
    controller = module.get<DiscoverController>(DiscoverController);
  });

  it("GET /search — retorna resultados", async () => {
    const result = await controller.search("test");
    expect(result.items).toBeDefined();
  });

  it("GET /discover — retorna mídias", async () => {
    const result = await controller.discover();
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("GET /trending — retorna trending", async () => {
    const result = await controller.trending();
    expect(result.items).toBeDefined();
  });
});
