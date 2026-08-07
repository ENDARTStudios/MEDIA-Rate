import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Redis: any = require("ioredis");

interface EntradaMemoria {
  valor: string;
  expira: number; // epoch ms
}

/**
 * CacheService (T210, Fase 6.10) — cache de aplicação com Redis (ioredis).
 *
 * - Chave de endpoints = SHA-256 da URL completa (inclui query params).
 * - readThrough com status HIT/MISS (para o header X-Cache).
 * - FALLBACK MEMÓRIA: se o Redis estiver indisponível, os métodos degradam
 *   para um Map local com TTL — a aplicação NUNCA quebra por falta de Redis.
 *   O set() espelha sempre na memória (fallback pronto); o get() tenta Redis
 *   primeiro e cai na memória em erro.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  private readonly defaultTTL = 300;
  private readonly memoria = new Map<string, EntradaMemoria>();

  constructor(redisUrl?: string, cliente?: unknown) {
    // T210: client injetável (testes) — mantém o caminho real com ioredis.
    if (cliente) {
      this.redis = cliente;
      return;
    }
    const url = redisUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379";
    const isLocal = /localhost|127\.0\.0\.1|::1|\.internal/.test(url);

    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...(!isLocal ? { tls: {} } : {}),
    });
    this.redis.on("error", (e: Error) => this.logger.warn(`Redis connection error: ${e.message}`));
  }

  getRedisClient() {
    return this.redis;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: any;

  /** T210: chave determinística = SHA-256 da URL completa (query incluída). */
  hashKey(url: string): string {
    return createHash("sha256").update(url).digest("hex");
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    } catch {
      // Redis indisponível → fallback memória.
      const m = this.memoria.get(key);
      if (!m || m.expira <= Date.now()) {
        this.memoria.delete(key);
        return null;
      }
      try {
        return JSON.parse(m.valor) as T;
      } catch {
        return m.valor as unknown as T;
      }
    }
  }

  async set(key: string, value: unknown, ttlSec = this.defaultTTL): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    // Espelha na memória (fallback pronto para Redis down).
    this.memoria.set(key, { valor: serialized, expira: Date.now() + ttlSec * 1000 });
    try {
      await this.redis.set(key, serialized, "EX", ttlSec);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttlSec}s)`);
    } catch {
      this.logger.debug(`Cache SET (memória): ${key} — Redis indisponível`);
    }
  }

  async del(key: string): Promise<void> {
    this.memoria.delete(key);
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch {
      /* Redis indisponível — memória já limpa */
    }
  }

  async delPattern(pattern: string): Promise<void> {
    for (const k of [...this.memoria.keys()]) {
      if (k.includes(pattern.replace("*", ""))) this.memoria.delete(k);
    }
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Cache DEL pattern "${pattern}": ${keys.length} keys`);
      }
    } catch {
      /* Redis indisponível — memória já limpa */
    }
  }

  async readThrough<T>(key: string, ttlSec: number, fetchFn: () => Promise<T>): Promise<T> {
    const { value } = await this.readThroughWithStatus(key, ttlSec, fetchFn);
    return value;
  }

  /** T210: readThrough com status (HIT/MISS) para o header X-Cache. */
  async readThroughWithStatus<T>(
    key: string,
    ttlSec: number,
    fetchFn: () => Promise<T>,
  ): Promise<{ value: T; hit: boolean }> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${key}`);
      return { value: cached, hit: true };
    }
    this.logger.debug(`Cache MISS: ${key}`);
    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSec);
    return { value: fresh, hit: false };
  }

  async invalidateOnWrite(key: string): Promise<void> {
    await this.del(key);
    await this.delPattern(`${key}:*`);
  }

  /** T211: encerra o client Redis com timeout de 5s (nunca trava o shutdown). */
  async shutdown(): Promise<void> {
    try {
      await Promise.race([this.redis.quit(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
      this.logger.log("Redis fechado");
    } catch (err) {
      this.logger.warn(`Redis shutdown com erro (ignorado): ${String(err)}`);
    }
  }

  async onModuleDestroy() {
    await this.shutdown();
  }
}

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(private readonly cache: CacheService) {}

  async onMediaUpdated(mediaId: string): Promise<void> {
    await this.cache.del(`midias:${mediaId}`);
    await this.cache.del(`midias:${mediaId}:media-score`);
    // Listas usam chave = hash da URL — limpa o padrão inteiro.
    await this.cache.delPattern("midias:*");
    await this.cache.delPattern("catalog:*");
    await this.cache.delPattern("discover:*");
    this.logger.debug(`Cache invalidated for midias:${mediaId}`);
  }

  async onMediaCreated(): Promise<void> {
    await this.cache.delPattern("midias:*");
    await this.cache.delPattern("catalog:*");
    await this.cache.delPattern("discover:*");
  }
}
