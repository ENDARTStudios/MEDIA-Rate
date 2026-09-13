import type { StorageAdapter } from "./storage.port.js";
import { InMemoryStorage } from "./in-memory.storage.js";
import { R2Storage, r2ConfigFromEnv } from "./r2.storage.js";
import { UnconfiguredStorage } from "./unconfigured.storage.js";

export interface StorageLogger {
  warn: (msg: string) => void;
}

/**
 * T457 — seleção do StorageAdapter (testável, sem Nest DI).
 *
 * - env R2 completa → R2Storage (produção real).
 * - produção sem env R2 → UnconfiguredStorage (fail-closed: 503, nunca
 *   grava em memória) + warn de boot.
 * - dev/test sem env → InMemoryStorage (conveniência local).
 */
export function selecionarStorage(
  env: NodeJS.ProcessEnv = process.env,
  logger: StorageLogger = console,
): StorageAdapter {
  const cfg = r2ConfigFromEnv(env);
  if (cfg) return new R2Storage(cfg);
  if (env.NODE_ENV === "production") {
    logger.warn(
      "[storage] R2 não configurado em produção — upload de assets retornará 503 (fail-closed).",
    );
    return new UnconfiguredStorage();
  }
  return new InMemoryStorage();
}
