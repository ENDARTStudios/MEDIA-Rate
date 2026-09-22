import { Injectable, Logger, type OnModuleDestroy, Optional } from "@nestjs/common";
import { CacheService } from "../../common/cache.service.js";
import { mascararEmail, mascararIp } from "../../common/pii-mask.js";

/**
 * Lockout progressivo (T3.3) com Redis (T020/7.5).
 *
 * Estratégia: contador de tentativas falhas por chave (IP + email normalizado).
 * Após 5 tentativas falhas consecutivas, aplica bloqueio exponencial:
 *   1º bloqueio: 1min
 *   2º bloqueio: 5min
 *   3º bloqueio: 15min
 *   4º bloqueio: 1h
 *   5º bloqueio (e subsequentes): 24h
 *
 * Redis: operações atômicas via pipeline (INCR + EXPIRE).
 * Global IP: se > 50 falhas de qualquer email em 5min, bloqueia IP inteiro.
 * Fallback: se Redis indisponível, usa Map em memória local + log de alerta.
 */

interface LockoutEntry {
  failedCount: number;
  blockedUntil: number;
  lastAttempt: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const WINDOW_SEC = 15 * 60;
const MAX_FAILURES_BEFORE_LOCK = 5;
const GLOBAL_IP_MAX_FAILURES = 50;
const GLOBAL_IP_WINDOW_SEC = 300; // 5min
const LOCK_DURATIONS_SEC = [
  60, // 1min — 1º bloqueio
  300, // 5min — 2º
  900, // 15min — 3º
  3600, // 1h — 4º
  86400, // 24h — 5º e subsequentes
];

@Injectable()
export class LockoutService implements OnModuleDestroy {
  private readonly logger = new Logger(LockoutService.name);
  private readonly entries = new Map<string, LockoutEntry>();
  private redisAvailable = true;

  constructor(@Optional() private readonly cacheService?: CacheService) {}

  async onModuleDestroy(): Promise<void> {
    // Cleanup do Map local (nenhuma ação de shutdown necessária para Redis).
  }

  /**
   * Chave normalizada: IP + email lowercase.
   */
  private key(ip: string, email: string): string {
    return `lockout:${ip}:${email.toLowerCase().trim()}`;
  }

  private globalKey(ip: string): string {
    return `lockout:global:${ip}`;
  }

  private isRedisReachable(): boolean {
    return this.cacheService !== undefined && this.redisAvailable;
  }

  /**
   * Verifica se a chave está bloqueada no momento.
   */
  async isLocked(ip: string, email: string): Promise<{ locked: boolean; remainingMs: number }> {
    if (this.isRedisReachable()) {
      return this.isLockedRedis(ip, email);
    }
    return this.isLockedLocal(ip, email);
  }

  private async isLockedRedis(
    ip: string,
    email: string,
  ): Promise<{ locked: boolean; remainingMs: number }> {
    try {
      const cache = this.cacheService;
      if (cache === undefined) return this.isLockedLocal(ip, email);
      const k = this.key(ip, email);
      const ttl = await cache.getRedisClient().ttl(k);
      if (ttl < 0) return { locked: false, remainingMs: 0 }; // key não existe
      const counter = await cache.getRedisClient().get(k);
      const count = counter ? Number.parseInt(counter, 10) : 0;
      const isAtThreshold = count >= MAX_FAILURES_BEFORE_LOCK;
      if (isAtThreshold && ttl > 0) {
        return { locked: true, remainingMs: ttl * 1000 };
      }
      return { locked: false, remainingMs: 0 };
    } catch {
      this.markRedisUnavailable();
      return this.isLockedLocal(ip, email);
    }
  }

  private isLockedLocal(ip: string, email: string): { locked: boolean; remainingMs: number } {
    const k = this.key(ip, email);
    const entry = this.entries.get(k);
    if (!entry) return { locked: false, remainingMs: 0 };
    const now = Date.now();
    if (entry.blockedUntil > now) {
      return { locked: true, remainingMs: entry.blockedUntil - now };
    }
    return { locked: false, remainingMs: 0 };
  }

  /**
   * Registra tentativa falha. Se atingir threshold, aplica bloqueio.
   */
  async registerFailure(
    ip: string,
    email: string,
  ): Promise<{
    failedCount: number;
    locked: boolean;
    lockedForMs: number;
  }> {
    if (this.isRedisReachable()) {
      return this.registerFailureRedis(ip, email);
    }
    return this.registerFailureLocal(ip, email);
  }

  private async registerFailureRedis(
    ip: string,
    email: string,
  ): Promise<{
    failedCount: number;
    locked: boolean;
    lockedForMs: number;
  }> {
    try {
      const cache = this.cacheService;
      if (cache === undefined) return this.registerFailureLocal(ip, email);
      const redis = cache.getRedisClient();
      const k = this.key(ip, email);
      const globalK = this.globalKey(ip);

      // Pipeline atômico: INCR no contador por IP+email + INCR no contador global
      const pipe = redis.pipeline();
      pipe.incr(k);
      pipe.incr(globalK);
      const results = await pipe.exec();

      if (!results) {
        this.markRedisUnavailable();
        return this.registerFailureLocal(ip, email);
      }

      const failedCount = results[0]?.[1] as number;
      const globalCount = results[1]?.[1] as number;

      // TTL no contador global: 5min
      await redis.expire(globalK, GLOBAL_IP_WINDOW_SEC);

      // Bloqueio por IP global (> 50 falhas em 5min)
      if (globalCount >= GLOBAL_IP_MAX_FAILURES) {
        const globalBlocked = await redis.ttl(globalK);
        if (globalBlocked > 0) {
          const lockDur =
            LOCK_DURATIONS_SEC[
              Math.min(4, Math.floor(failedCount / MAX_FAILURES_BEFORE_LOCK) - 1)
            ] ??
            LOCK_DURATIONS_SEC[4] ??
            86400;
          await redis.expire(k, lockDur);
          await redis.expire(globalK, lockDur);
          this.logger.warn(
            `Lockout global aplicado para IP ${mascararIp(ip)} (${globalCount} falhas em ${GLOBAL_IP_WINDOW_SEC}s)`,
          );
          return { failedCount, locked: true, lockedForMs: lockDur * 1000 };
        }
      }

      // Bloqueio por IP+email ao atingir threshold
      const isMultipleOfThreshold = failedCount % MAX_FAILURES_BEFORE_LOCK === 0;
      if (isMultipleOfThreshold) {
        const lockLevel = Math.min(
          Math.floor(failedCount / MAX_FAILURES_BEFORE_LOCK) - 1,
          LOCK_DURATIONS_SEC.length - 1,
        );
        const lockDur = LOCK_DURATIONS_SEC[lockLevel] ?? 86400;
        await redis.expire(k, lockDur);
        this.logger.warn(
          `Lockout ${lockLevel + 1}o nível (${lockDur}s) aplicado (${mascararEmail(email)}): ${failedCount} falhas`,
        );
        return { failedCount, locked: true, lockedForMs: lockDur * 1000 };
      }

      // Sem bloqueio ainda: mantém a janela de 15min
      await redis.expire(k, WINDOW_SEC);
      return { failedCount, locked: false, lockedForMs: 0 };
    } catch {
      this.markRedisUnavailable();
      return this.registerFailureLocal(ip, email);
    }
  }

  private registerFailureLocal(
    ip: string,
    email: string,
  ): {
    failedCount: number;
    locked: boolean;
    lockedForMs: number;
  } {
    const k = this.key(ip, email);
    const now = Date.now();
    const existing = this.entries.get(k);

    let entry: LockoutEntry;
    if (!existing || now - existing.lastAttempt > WINDOW_MS) {
      entry = { failedCount: 1, blockedUntil: 0, lastAttempt: now };
    } else {
      entry = {
        failedCount: existing.failedCount + 1,
        blockedUntil: existing.blockedUntil,
        lastAttempt: now,
      };
    }

    let locked = false;
    let lockedForMs = 0;
    const isMultipleOfThreshold = entry.failedCount % MAX_FAILURES_BEFORE_LOCK === 0;
    const blockExpired = entry.blockedUntil <= now;
    if (isMultipleOfThreshold && blockExpired) {
      const lockLevel = Math.min(
        Math.floor(entry.failedCount / MAX_FAILURES_BEFORE_LOCK) - 1,
        LOCK_DURATIONS_SEC.length - 1,
      );
      const duration = LOCK_DURATIONS_SEC[lockLevel];
      if (duration !== undefined) {
        lockedForMs = duration * 1000;
        entry.blockedUntil = now + lockedForMs;
      }
      locked = true;
      this.logger.warn(
        `Lockout local aplicado (${mascararEmail(email)}): nível ${lockLevel + 1}, ${lockedForMs / 1000}s`,
      );
    }

    this.entries.set(k, entry);
    return { failedCount: entry.failedCount, locked, lockedForMs };
  }

  /**
   * Reseta contador após login bem-sucedido.
   */
  async resetOnSuccess(ip: string, email: string): Promise<void> {
    if (this.isRedisReachable()) {
      try {
        const cache = this.cacheService;
        if (cache === undefined) return;
        const k = this.key(ip, email);
        await cache.getRedisClient().del(k);
        return;
      } catch {
        this.markRedisUnavailable();
      }
    }
    const k = this.key(ip, email);
    this.entries.delete(k);
  }

  /**
   * Limpa entradas expiradas (chamar periodicamente).
   */
  cleanup(): number {
    if (this.isRedisReachable()) return 0; // Redis auto-expira via TTL
    const now = Date.now();
    let removed = 0;
    for (const [k, entry] of this.entries) {
      if (entry.blockedUntil < now && now - entry.lastAttempt > WINDOW_MS) {
        this.entries.delete(k);
        removed++;
      }
    }
    return removed;
  }

  private markRedisUnavailable(): void {
    if (this.redisAvailable) {
      this.redisAvailable = false;
      this.logger.error("Redis indisponível — LockoutService operando em modo local (degradado).");
    }
  }
}
