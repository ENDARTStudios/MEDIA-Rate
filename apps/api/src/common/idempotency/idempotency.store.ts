import { createHash } from "node:crypto";

/**
 * T326 — store de idempotência (chave composta → resposta) com TTL.
 *
 * Em memória para Beta single-instance. A interface (get/set por chave
 * composta) é propositalmente agnóstica de backend: trocar por Redis ou
 * por uma tabela `idempotencia_registro` não altera o interceptor.
 *
 * Segurança:
 * - A chave composta (user:method:url:key) é hasheada (SHA-256) antes de
 *   ser usada como chave do Map — nunca guardamos a Idempotency-Key crua.
 * - TTL curto + teto de entradas evita crescimento ilimitado (DoS).
 * - Só guardamos a RESPOSTA (nunca o corpo da requisição nem segredos).
 */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h (RFC draft-ietf-httpapi-idempotency-key-header)
const MAX_ENTRIES = 10_000;

interface Entry {
  response: unknown;
  expiresAt: number;
}

export class IdempotencyStore {
  private readonly entries = new Map<string, Entry>();

  private hash(composite: string): string {
    return createHash("sha256").update(composite).digest("hex");
  }

  /** Retorna a resposta cacheada se existir e não expirou; senão undefined. */
  get(composite: string): unknown | undefined {
    const h = this.hash(composite);
    const entry = this.entries.get(h);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(h);
      return undefined;
    }
    return entry.response;
  }

  /** Guarda a resposta associada à chave composta, com TTL. */
  set(composite: string, response: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
    if (this.entries.size >= MAX_ENTRIES) this.prune();
    this.entries.set(this.hash(composite), { response, expiresAt: Date.now() + ttlMs });
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}
