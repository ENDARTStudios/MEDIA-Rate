/**
 * T194 — incomplete-sanitization no CacheService.delPattern (fallback de memória).
 *
 * Vetor original: `k.includes(pattern.replace("*", ""))` — substituição parcial
 * (só o primeiro `*`) e match sem âncora. Consequências:
 *  - padrões com múltiplos wildcards não casavam nada na memória (divergência
 *    do Redis KEYS, que casaria);
 *  - chaves onde o prefixo aparecia no meio eram removidas indevidamente
 *    (namespace escape no fallback: `delPattern("midias:*")` apagava `x:midias:1`).
 *
 * O FakeRedis abaixo implementa o contrato glob do Redis KEYS (apenas `*`) de
 * forma independente do guard do src — é o oracle deste teste.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { CacheService } from "../src/common/cache.service.js";

function globRedis(pattern: string, chave: string): boolean {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${pattern.split("*").map(esc).join(".*")}$`);
  return regex.test(chave);
}

class FakeRedis {
  store = new Map<string, string>();
  falhar = false;
  on() {
    return this;
  }
  async get(k: string) {
    if (this.falhar) throw new Error("Redis indisponivel");
    return this.store.get(k) ?? null;
  }
  async set(k: string, v: string) {
    if (this.falhar) throw new Error("Redis indisponivel");
    this.store.set(k, v);
    return "OK";
  }
  async del(...keys: string[]) {
    if (this.falhar) throw new Error("Redis indisponivel");
    let n = 0;
    for (const k of keys) if (this.store.delete(k)) n++;
    return n;
  }
  async keys(pattern: string) {
    if (this.falhar) throw new Error("Redis indisponivel");
    return [...this.store.keys()].filter((k) => globRedis(pattern, k));
  }
  async quit() {
    return "OK";
  }
}

describe("CacheService — sanitização de pattern no fallback de memória (T194)", () => {
  let redis: FakeRedis;
  let svc: CacheService;

  beforeEach(() => {
    redis = new FakeRedis();
    svc = new CacheService(undefined, redis);
  });

  it("delPattern remove da memória SÓ as chaves do namespace (ancorado, sem escape)", async () => {
    await svc.set("midias:1", { a: 1 });
    await svc.set("x:midias:1", { b: 2 }); // contém o prefixo, mas fora do namespace
    await svc.delPattern("midias:*");
    redis.falhar = true; // força o fallback de memória no get
    expect(await svc.get("midias:1")).toBeNull();
    expect(await svc.get("x:midias:1")).toEqual({ b: 2 });
  });

  it("delPattern com múltiplos wildcards casa como o glob do Redis (memória e redis)", async () => {
    await svc.set("a:1:b2", { v: 1 });
    await svc.set("a:1:c2", { v: 2 });
    await svc.delPattern("a:*:b*");
    expect(await svc.get("a:1:b2")).toBeNull(); // removido no Redis fake
    expect(await svc.get("a:1:c2")).toEqual({ v: 2 });
    redis.falhar = true;
    expect(await svc.get("a:1:b2")).toBeNull(); // memória também limpa
    expect(await svc.get("a:1:c2")).toEqual({ v: 2 });
  });

  it("pattern inválido lança ANTES de tocar memória ou Redis (fail-closed)", async () => {
    await svc.set("midias:1", { a: 1 });
    const espiaoKeys = vi.spyOn(redis, "keys");
    await expect(svc.delPattern("midias:*\n")).rejects.toThrow(/pattern de cache invalido/i);
    expect(espiaoKeys).not.toHaveBeenCalled();
    redis.falhar = true;
    expect(await svc.get("midias:1")).toEqual({ a: 1 }); // memória intacta
  });

  it("rejeita metacaracteres não suportados (? [ ] \\)", async () => {
    for (const p of ["midias:?", "midias:[0]", "midias:\\", "midias:]"]) {
      await expect(svc.delPattern(p)).rejects.toThrow(/pattern de cache invalido/i);
    }
  });

  it("erro de pattern inválido NÃO vaza o valor do pattern", async () => {
    const suspeito = "token-super-secreto\n";
    let capturado: unknown = null;
    try {
      await svc.delPattern(suspeito);
    } catch (e) {
      capturado = e;
    }
    expect(capturado).toBeInstanceOf(Error);
    expect(String(capturado)).not.toContain("token-super-secreto");
  });

  it("delPattern mantém comportamento legítimo: redis.keys + del e limpeza da memória", async () => {
    await svc.set("catalog:pt:1", { v: 1 });
    await svc.set("discover:1", { v: 2 });
    const espiaoKeys = vi.spyOn(redis, "keys");
    await svc.delPattern("catalog:*");
    expect(espiaoKeys).toHaveBeenCalledWith("catalog:*");
    expect(await svc.get("catalog:pt:1")).toBeNull();
    expect(await svc.get("discover:1")).toEqual({ v: 2 });
  });

  it("delPattern com Redis indisponível ainda limpa a memória (degradação preservada)", async () => {
    await svc.set("midias:1", { a: 1 });
    redis.falhar = true;
    await expect(svc.delPattern("midias:*")).resolves.toBeUndefined();
    expect(await svc.get("midias:1")).toBeNull();
  });

  it("invalidateOnWrite limpa chave exata e namespace derivado, sem tocar vizinhos", async () => {
    await svc.set("midias:9", { v: 1 });
    await svc.set("midias:9:media-score", { v: 2 });
    await svc.set("x:midias:9", { v: 3 });
    const espiaoKeys = vi.spyOn(redis, "keys");
    await svc.invalidateOnWrite("midias:9");
    expect(espiaoKeys).toHaveBeenCalledWith("midias:9:*");
    redis.falhar = true;
    expect(await svc.get("midias:9")).toBeNull();
    expect(await svc.get("midias:9:media-score")).toBeNull();
    expect(await svc.get("x:midias:9")).toEqual({ v: 3 });
  });

  it("readThrough/get/set/del não quebram (hit, miss, TTL, remoção)", async () => {
    await svc.set("k1", { x: 1 }, 10);
    expect(await svc.get("k1")).toEqual({ x: 1 });
    const fetchFn = vi.fn().mockResolvedValue({ fresh: true });
    expect(await svc.readThrough("k2", 300, fetchFn)).toEqual({ fresh: true });
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(await svc.readThrough("k1", 300, fetchFn)).toEqual({ x: 1 }); // hit
    expect(fetchFn).toHaveBeenCalledOnce();
    await svc.del("k1");
    expect(await svc.get("k1")).toBeNull();
  });

  it("logs do cache não contêm o valor armazenado", async () => {
    const espiaoDebug = vi.spyOn(Logger.prototype, "debug").mockImplementation(() => undefined);
    try {
      await svc.set("k", { token: "valor-secreto-xyz" });
      await svc.get("k");
      const linhas = espiaoDebug.mock.calls.map((c) => c.map(String).join(" ")).join("\n");
      expect(linhas).not.toContain("valor-secreto-xyz");
    } finally {
      espiaoDebug.mockRestore();
    }
  });
});
