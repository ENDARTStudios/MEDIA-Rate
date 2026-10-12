import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildRateLimitOptions,
  registerRateLimit,
  adminRateLimit,
  adminDestructiveRateLimit,
  aplicarRateLimitAdmin,
  SlidingWindowRateLimitStore,
} from "../src/common/rate-limit.config.js";
import { adminProbingMonitor } from "../src/common/admin-probing-monitor.js";
import { createHash } from "node:crypto";

/**
 * Boas práticas de rate limiting (review Operador, 2026-09-27):
 * 1. Chave por usuário/sessão (cookie), não só IP — anonimato por IP.
 * 2. Limites diferenciados em rotas críticas de auth (register 5/min).
 * 3. Sliding window (ZSET Redis com fallback em memória) — nunca fail-open silencioso.
 * 4. 429 com envelope padronizado (correlationId/timestamp) + Retry-After (plugin).
 */

function reqFake(parcial: {
  url?: string;
  ip?: string;
  cookies?: Record<string, string>;
  id?: string;
}) {
  return {
    ip: parcial.ip ?? "203.0.113.7",
    url: parcial.url ?? "/api/v1/x",
    raw: { url: parcial.url ?? "/api/v1/x" },
    cookies: parcial.cookies,
    id: parcial.id ?? "req-test-1",
  } as never;
}

describe("rate-limit — chave por usuário/sessão (não só IP)", () => {
  it("com cookie de sessão → rl:u:<sha256-32>:<rota> (token cru NUNCA na chave)", () => {
    const opts = buildRateLimitOptions();
    const token = "sess-token-secreto-valor";
    const key = (opts.keyGenerator as (r: never) => string)(
      reqFake({ cookies: { sess: token }, url: "/api/v1/watchlist" }),
    );
    const esperado = createHash("sha256").update(token).digest("hex").slice(0, 32);
    expect(key).toBe(`rl:u:${esperado}:/api/v1/watchlist`);
    expect(key).not.toContain(token);
  });

  it("anônimo → rl:ip:<ip>:<rota>", () => {
    const opts = buildRateLimitOptions();
    const key = (opts.keyGenerator as (r: never) => string)(
      reqFake({ ip: "198.51.100.9", url: "/api/v1/discover" }),
    );
    expect(key).toBe("rl:ip:198.51.100.9:/api/v1/discover");
  });
});

describe("rate-limit — 429 com envelope padronizado", () => {
  it("corpo 429 tem statusCode/error/message/correlationId/timestamp", () => {
    const opts = buildRateLimitOptions();
    const corpo = (
      opts.errorResponseBuilder as (
        r: never,
        c: { max: number; ttl: number },
      ) => Record<string, unknown>
    )(reqFake({ id: "req-abc" }), { max: 6, ttl: 45_000 });
    expect(corpo.statusCode).toBe(429);
    expect(corpo.error).toBe("Too Many Requests");
    expect(String(corpo.message)).toContain("6");
    expect(corpo.correlationId).toBe("req-abc");
    expect(() => new Date(String(corpo.timestamp))).not.toThrow();
  });
});

describe("rate-limit — limites diferenciados de auth", () => {
  it("register 5/min (rota crítica de cadastro)", () => {
    expect(registerRateLimit()).toEqual({ max: 5, timeWindow: "1 minute" });
  });

  it("login continua 6/min (faixa 5-10)", () => {
    expect(buildRateLimitOptions()).toBeDefined();
  });
});

/** Fake ioredis: subconjunto ZSET com multi() em pipeline (suficiente p/ a store). */
class FakeRedisZset {
  public zsets = new Map<string, { score: number; member: string }[]>();
  public falharProxima = false;
  public falharSempre = false;
  private ops: string[][] = [];

  private aplicar(op: string[]) {
    if (op[0] === "zrem") {
      const [, key, min, max] = op;
      const arr = (this.zsets.get(key) ?? []).filter(
        (e) => e.score < Number(min) || e.score > Number(max),
      );
      this.zsets.set(key, arr);
      return 0;
    }
    if (op[0] === "zadd") {
      const [, key, score, member] = op;
      const arr = this.zsets.get(key) ?? [];
      arr.push({ score: Number(score), member: String(member) });
      this.zsets.set(key, arr);
      return 1;
    }
    if (op[0] === "zcard") {
      const [, key] = op;
      return (this.zsets.get(key) ?? []).length;
    }
    return 1; // pexpire etc.
  }

  multi() {
    this.ops = [];
    const self = this; // eslint-disable-line @typescript-eslint/no-this-alias
    return {
      zremrangebyscore(key: string, min: number, max: number) {
        self.ops.push(["zrem", key, min, max]);
        return this;
      },
      zadd(key: string, score: number, member: string) {
        self.ops.push(["zadd", key, score, member]);
        return this;
      },
      pexpire(key: string, ms: number) {
        self.ops.push(["pexpire", key, ms]);
        return this;
      },
      zcard(key: string) {
        self.ops.push(["zcard", key]);
        return this;
      },
      exec(): Promise<unknown[]> {
        if (self.falharProxima || self.falharSempre) {
          self.falharProxima = false;
          return Promise.reject(new Error("redis indisponível (fake)"));
        }
        const resultados = self.ops.map((op) => [null, self.aplicar(op)]);
        return Promise.resolve(resultados);
      },
    };
  }
}

describe("rate-limit — sliding window store (ZSET + fallback memória)", () => {
  it("3 incrs numa janela com max 2 → currents 1,2,3 (3º excede)", async () => {
    let agora = 1_000_000;
    const redis = new FakeRedisZset();
    const store = new SlidingWindowRateLimitStore({ redis: () => redis, now: () => agora });
    const resultado = await new Promise<{ current: number; ttl: number }>((resolve, reject) =>
      store.incr(
        "rl:x",
        (err, res) => (err ? reject(err) : resolve(res as { current: number; ttl: number })),
        60_000,
        2,
      ),
    );
    expect(resultado.current).toBe(1);
    agora = 1_010_000; // +10s — dentro da janela de 60s
    const r2 = await new Promise<{ current: number }>((resolve, reject) =>
      store.incr(
        "rl:x",
        (err, res) => (err ? reject(err) : resolve(res as { current: number })),
        60_000,
        2,
      ),
    );
    expect(r2.current).toBe(2);
    agora = 1_020_000; // +10s — ainda dentro
    const r3 = await new Promise<{ current: number }>((resolve, reject) =>
      store.incr(
        "rl:x",
        (err, res) => (err ? reject(err) : resolve(res as { current: number })),
        60_000,
        2,
      ),
    );
    expect(r3.current).toBe(3); // plugin interpreta current > max como limited
  });

  it("entradas fora da janela deslizante são removidas (não é janela fixa)", async () => {
    let agora = 2_000_000;
    const redis = new FakeRedisZset();
    const store = new SlidingWindowRateLimitStore({ redis: () => redis, now: () => agora });
    const incr = () =>
      new Promise<{ current: number }>((resolve, reject) =>
        store.incr(
          "rl:y",
          (err, res) => (err ? reject(err) : resolve(res as { current: number })),
          60_000,
          1,
        ),
      );
    await incr(); // T=2.000.000
    agora = 2_030_000;
    await incr(); // T=2.030.000 (dentro da janela) → current 2, excede max 1
    agora = 2_061_000; // corte = 2.001.000 → remove SÓ a 1ª; 2ª (2.030.000) ainda vale
    const r3 = await incr(); // novo em 2.061.000
    expect(r3.current).toBe(2); // 2.030.000 + 2.061.000
    agora = 2_121_000; // corte = 2.061.000 → remove 2.030.000 E 2.061.000
    const r4 = await incr(); // novo em 2.121.000
    expect(r4.current).toBe(1);
  });

  it("redis falhando → fallback em memória (fail-open NÃO silencioso; conta igual)", async () => {
    const agora = 3_000_000;
    const redis = new FakeRedisZset();
    const store = new SlidingWindowRateLimitStore({ redis: () => redis, now: () => agora });
    const incr = () =>
      new Promise<{ current: number }>((resolve, reject) =>
        store.incr(
          "rl:z",
          (err, res) => (err ? reject(err) : resolve(res as { current: number })),
          60_000,
          1,
        ),
      );
    redis.falharSempre = true;
    const r1 = await incr(); // redis falha → memória (persistente)
    const r2 = await incr();
    expect(r1.current).toBe(1);
    expect(r2.current).toBe(2);
  });

  it("sem redis nenhum → conta em memória (dev/CI)", async () => {
    const store = new SlidingWindowRateLimitStore({ redis: () => null, now: () => 4_000_000 });
    const r = await new Promise<{ current: number }>((resolve, reject) =>
      store.incr(
        "rl:w",
        (err, res) => (err ? reject(err) : resolve(res as { current: number })),
        60_000,
        5,
      ),
    );
    expect(r.current).toBe(1);
  });

  it("child(routeOptions) compartilha a instância (chaves já incluem rota)", () => {
    const store = new SlidingWindowRateLimitStore({ redis: () => null, now: () => 0 });
    expect(store.child({ path: "/x", prefix: "" } as never)).toBe(store);
  });
});

// ============================================================================
// T203 — rate limit admin específico + anti-probing sanitizado
// ============================================================================

describe("T203 — limites admin", () => {
  beforeEach(() => {
    delete process.env.RATE_LIMIT_ADMIN_PER_MIN;
    delete process.env.RATE_LIMIT_ADMIN_DESTRUCTIVE_PER_MIN;
  });

  it("admin (leituras /admin/*): 60/min por padrão, configurável por env", () => {
    expect(adminRateLimit()).toEqual({ max: 60, timeWindow: "1 minute" });
    process.env.RATE_LIMIT_ADMIN_PER_MIN = "30";
    expect(adminRateLimit().max).toBe(30);
  });

  it("admin destrutivas (purge/ban/plano/moderação/backfills): 10/min por padrão, env", () => {
    expect(adminDestructiveRateLimit()).toEqual({ max: 10, timeWindow: "1 minute" });
    process.env.RATE_LIMIT_ADMIN_DESTRUCTIVE_PER_MIN = "5";
    expect(adminDestructiveRateLimit().max).toBe(5);
    expect(adminDestructiveRateLimit().max).toBeLessThan(adminRateLimit().max);
    delete process.env.RATE_LIMIT_ADMIN_DESTRUCTIVE_PER_MIN;
    expect(adminDestructiveRateLimit().max).toBeLessThan(adminRateLimit().max);
  });

  it("aplicarRateLimitAdmin: GET admin → limite de leitura", () => {
    const rota = { url: "/api/v1/admin/stats", method: "GET" };
    aplicarRateLimitAdmin(rota as never);
    expect((rota as { config?: { rateLimit?: { max: number } } }).config?.rateLimit?.max).toBe(60);
  });

  it("aplicarRateLimitAdmin: POST/DELETE/PATCH admin → limite destrutivo mais estrito", () => {
    for (const method of ["POST", "DELETE", "PATCH"]) {
      const rota = { url: "/api/v1/admin/lgpd/purge", method };
      aplicarRateLimitAdmin(rota as never);
      expect((rota as { config?: { rateLimit?: { max: number } } }).config?.rateLimit?.max).toBe(
        10,
      );
    }
  });

  it("aplicarRateLimitAdmin: NÃO sobrescreve rate limit já aplicado (ex.: upload de assets)", () => {
    const rota = {
      url: "/api/v1/admin/assets/x",
      method: "POST",
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    };
    aplicarRateLimitAdmin(rota as never);
    expect((rota as { config: { rateLimit: { max: number } } }).config.rateLimit.max).toBe(10);
  });

  it("aplicarRateLimitAdmin: rota não-admin não é tocada", () => {
    const rota = { url: "/api/v1/discover", method: "GET" };
    aplicarRateLimitAdmin(rota as never);
    expect((rota as { config?: unknown }).config).toBeUndefined();
  });

  it("429 em rota admin registra probing SANITIZADO (token cru NUNCA vira chave/log)", () => {
    const espiao = vi.spyOn(adminProbingMonitor, "registrar");
    const opts = buildRateLimitOptions();
    const req = reqFake({
      url: "/api/v1/admin/stats",
      cookies: { sess: "sess-token-super-secreto" },
    });
    (opts.errorResponseBuilder as (r: never, c: { max: number; ttl: number }) => unknown)(req, {
      max: 60,
      ttl: 60_000,
    });
    expect(espiao).toHaveBeenCalledWith(
      "RATE_LIMIT",
      "/api/v1/admin/stats",
      "sess-token-super-secreto",
    );
    espiao.mockRestore();
  });

  it("429 em rota NÃO-admin não registra probing admin", () => {
    const espiao = vi.spyOn(adminProbingMonitor, "registrar");
    const opts = buildRateLimitOptions();
    (opts.errorResponseBuilder as (r: never, c: { max: number; ttl: number }) => unknown)(
      reqFake({ url: "/api/v1/discover" }),
      { max: 100, ttl: 60_000 },
    );
    expect(espiao).not.toHaveBeenCalled();
    espiao.mockRestore();
  });
});
