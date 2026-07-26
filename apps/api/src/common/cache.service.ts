import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
const Redis: any = require("ioredis");

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  private readonly defaultTTL = 300;

  constructor(redisUrl?: string) {
    const url = redisUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379";
    const isLocal = /localhost|127\.0\.0\.1|::1/.test(url);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  }

  async set(key: string, value: unknown, ttlSec = this.defaultTTL): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    await this.redis.set(key, serialized, "EX", ttlSec);
    this.logger.debug(`Cache SET: ${key} (TTL: ${ttlSec}s)`);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.debug(`Cache DEL: ${key}`);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.debug(`Cache DEL pattern "${pattern}": ${keys.length} keys`);
    }
  }

  async readThrough<T>(key: string, ttlSec: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) { this.logger.debug(`Cache HIT: ${key}`); return cached; }
    this.logger.debug(`Cache MISS: ${key}`);
    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSec);
    return fresh;
  }

  async invalidateOnWrite(key: string): Promise<void> {
    await this.del(key);
    await this.delPattern(`${key}:*`);
  }

  async onModuleDestroy() {
    try { await this.redis.quit(); } catch { /* Redis nao conectado — nada a fechar */ }
    this.logger.log("Redis connection closed.");
  }
}

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(private readonly cache: CacheService) {}

  async onMediaUpdated(mediaId: string): Promise<void> {
    await this.cache.invalidateOnWrite(`media:${mediaId}`);
    await this.cache.delPattern("catalog:*");
    await this.cache.delPattern("discover:*");
    this.logger.debug(`Cache invalidated for media:${mediaId}`);
  }

  async onMediaCreated(): Promise<void> {
    await this.cache.delPattern("catalog:*");
    await this.cache.delPattern("discover:*");
  }
}
