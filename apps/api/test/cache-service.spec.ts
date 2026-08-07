import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { CacheService, CacheInvalidationService } from "../src/common/cache.service.js";

interface MockRedis {
  get: Mock<(key: string) => Promise<string | null>>;
  set: Mock<(key: string, value: string, mode: string, ttl: number) => Promise<unknown>>;
  del: Mock<(...keys: string[]) => Promise<number>>;
  keys: Mock<(pattern: string) => Promise<string[]>>;
  quit: Mock<() => Promise<unknown>>;
  on: Mock<(event: string, listener: (...args: unknown[]) => void) => void>;
}

describe("CacheService (unit — mock Redis)", () => {
  let service: CacheService;
  let mockRedis: MockRedis;

  beforeEach(async () => {
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
      quit: vi.fn().mockResolvedValue("OK"),
      on: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheService,
          useFactory: () => {
            const svc = new CacheService();
            Object.assign(svc, { redis: mockRedis });
            return svc;
          },
        },
      ],
    }).compile();
    service = module.get<CacheService>(CacheService);
  });

  it("get — cache hit retorna dados parseados", async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ name: "test" }));
    const result = await service.get<{ name: string }>("key1");
    expect(result).toEqual({ name: "test" });
  });

  it("get — cache miss retorna null", async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await service.get("key1");
    expect(result).toBeNull();
  });

  it("set — armazena com TTL", async () => {
    await service.set("key1", { data: 123 }, 60);
    expect(mockRedis.set).toHaveBeenCalledWith("key1", JSON.stringify({ data: 123 }), "EX", 60);
  });

  it("del — remove chave", async () => {
    await service.del("key1");
    expect(mockRedis.del).toHaveBeenCalledWith("key1");
  });

  it("delPattern — varre e deleta por padrão", async () => {
    mockRedis.keys.mockResolvedValue(["key:1", "key:2", "key:3"]);
    await service.delPattern("key:*");
    expect(mockRedis.keys).toHaveBeenCalledWith("key:*");
    expect(mockRedis.del).toHaveBeenCalledWith("key:1", "key:2", "key:3");
  });

  it("readThrough — cache hit não chama fetchFn", async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ cached: true }));
    const fetchFn = vi.fn().mockResolvedValue({ cached: false });
    const result = await service.readThrough("key1", 300, fetchFn);
    expect(result).toEqual({ cached: true });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("readThrough — cache miss chama fetchFn e armazena", async () => {
    mockRedis.get.mockResolvedValue(null);
    const fetchFn = vi.fn().mockResolvedValue({ fresh: true });
    const result = await service.readThrough("key1", 300, fetchFn);
    expect(result).toEqual({ fresh: true });
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(mockRedis.set).toHaveBeenCalledWith("key1", JSON.stringify({ fresh: true }), "EX", 300);
  });

  it("invalidateOnWrite — deleta chave + padrão", async () => {
    await service.invalidateOnWrite("media:123");
    expect(mockRedis.del).toHaveBeenCalledWith("media:123");
    expect(mockRedis.keys).toHaveBeenCalledWith("media:123:*");
  });
});

describe("CacheInvalidationService (unit)", () => {
  it("onMediaUpdated — invalida ficha + score + listas + catalog + discover", async () => {
    const mockCache = {
      del: vi.fn().mockResolvedValue(undefined),
      delPattern: vi.fn().mockResolvedValue(undefined),
    } as unknown as CacheService;
    const svc = new CacheInvalidationService(mockCache);
    await svc.onMediaUpdated("m1");
    expect(mockCache.del).toHaveBeenCalledWith("midias:m1");
    expect(mockCache.del).toHaveBeenCalledWith("midias:m1:media-score");
    expect(mockCache.delPattern).toHaveBeenCalledWith("midias:*");
    expect(mockCache.delPattern).toHaveBeenCalledWith("catalog:*");
    expect(mockCache.delPattern).toHaveBeenCalledWith("discover:*");
  });
});
