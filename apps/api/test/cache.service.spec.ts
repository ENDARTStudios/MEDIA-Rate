import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CacheService, CacheInvalidationService } from "../src/common/cache.service.js";

const redisMock = vi.hoisted(() => {
  let falhar = false;
  class FakeRedis {
    private store = new Map<string, string>();
    on() {
      return this;
    }
    async get(k: string) {
      if (falhar) throw new Error("Redis indisponível");
      return this.store.get(k) ?? null;
    }
    async set(k: string, v: string) {
      if (falhar) throw new Error("Redis indisponível");
      this.store.set(k, v);
      return "OK";
    }
    async del(...keys: string[]) {
      if (falhar) throw new Error("Redis indisponível");
      for (const k of keys) this.store.delete(k);
      return keys.length;
    }
    async keys(pattern: string) {
      if (falhar) throw new Error("Redis indisponível");
      const prefixo = pattern.replace("*", "");
      return [...this.store.keys()].filter((k) => k.includes(prefixo));
    }
    async quit() {
      return "OK";
    }
    _clear() {
      this.store.clear();
    }
  }
  return {
    FakeRedis,
    falhar: (v: boolean) => {
      falhar = v;
    },
    novo: () => new FakeRedis(),
  };
});

vi.mock("ioredis", () => redisMock.FakeRedis);

describe("CacheService (T210)", () => {
  let cache: CacheService;
  let cliente: { _clear: () => void };

  beforeEach(() => {
    redisMock.falhar(false);
    cliente = redisMock.novo() as unknown as { _clear: () => void };
    cache = new CacheService("redis://localhost:6379", cliente);
    cliente._clear();
  });

  afterEach(() => {
    redisMock.falhar(false);
  });

  it("hashKey: determinística e distinta por query params", () => {
    const k1 = cache.hashKey("/api/v1/midias?limit=5&tipo=FILME");
    const k2 = cache.hashKey("/api/v1/midias?limit=5&tipo=FILME");
    const k3 = cache.hashKey("/api/v1/midias?limit=5&tipo=SERIE");
    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("readThroughWithStatus: MISS na primeira, HIT na segunda", async () => {
    let chamadas = 0;
    const r1 = await cache.readThroughWithStatus("chave:1", 60, async () => {
      chamadas++;
      return { dado: "valor" };
    });
    expect(r1.hit).toBe(false);
    const r2 = await cache.readThroughWithStatus("chave:1", 60, async () => {
      chamadas++;
      return { dado: "outro" };
    });
    expect(r2.hit).toBe(true);
    expect(r2.value).toEqual({ dado: "valor" });
    expect(chamadas).toBe(1); // fetch só rodou uma vez
  });

  it("invalidateOnWrite: remove chave e derivadas (padrão chave:*)", async () => {
    await cache.set("midias:abc", { x: 1 }, 60);
    await cache.set("midias:abc:media-score", { y: 2 }, 60);
    await cache.set("midias:def", { z: 3 }, 60);
    await cache.invalidateOnWrite("midias:abc");
    expect(await cache.get("midias:abc")).toBeNull();
    expect(await cache.get("midias:abc:media-score")).toBeNull();
    expect(await cache.get("midias:def")).toEqual({ z: 3 });
  });

  it("fallback memória: Redis indisponível NÃO quebra (get/set degradam)", async () => {
    redisMock.falhar(true);
    await cache.set("chave:mem", { ok: true }, 60);
    const valor = await cache.get("chave:mem");
    expect(valor).toEqual({ ok: true });
    // del também degrada sem lançar.
    await expect(cache.del("chave:mem")).resolves.toBeUndefined();
  });

  it("fallback memória: TTL expirado retorna null", async () => {
    redisMock.falhar(true);
    await cache.set("chave:ttl", { ok: true }, 1); // 1s
    const antes = await cache.get("chave:ttl");
    expect(antes).toEqual({ ok: true });
    // Envelhece a entrada manualmente (expira <= now).
    const memoria = (cache as unknown as { memoria: Map<string, { expira: number }> }).memoria;
    const entrada = memoria.get("chave:ttl");
    if (entrada) entrada.expira = Date.now() - 1000;
    expect(await cache.get("chave:ttl")).toBeNull();
  });

  it("delPattern: limpa por prefixo (Redis e memória)", async () => {
    await cache.set("discover:aaa", 1, 60);
    await cache.set("discover:bbb", 2, 60);
    await cache.set("midias:ccc", 3, 60);
    await cache.delPattern("discover:*");
    expect(await cache.get("discover:aaa")).toBeNull();
    expect(await cache.get("discover:bbb")).toBeNull();
    expect(await cache.get("midias:ccc")).toEqual(3);
  });

  it("CacheInvalidationService.onMediaUpdated limpa ficha + score + listas", async () => {
    await cache.set("midias:abc", { a: 1 }, 60);
    await cache.set("midias:abc:media-score", { b: 2 }, 60);
    await cache.set("catalog:chave", { c: 3 }, 60);
    await cache.set("discover:chave", { d: 4 }, 60);
    const invalidation = new CacheInvalidationService(cache);
    await invalidation.onMediaUpdated("abc");
    expect(await cache.get("midias:abc")).toBeNull();
    expect(await cache.get("midias:abc:media-score")).toBeNull();
    expect(await cache.get("catalog:chave")).toBeNull();
    expect(await cache.get("discover:chave")).toBeNull();
  });
});
