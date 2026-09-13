import { Injectable } from "@nestjs/common";
import type { PutObjectInput, StorageAdapter } from "./storage.port.js";

/**
 * T453 — storage em memória para dev/test (R2 mockado). Não persiste entre
 * reinícios; serve para testes e para rodar sem credenciais R2.
 */
@Injectable()
export class InMemoryStorage implements StorageAdapter {
  readonly kind = "memory" as const;
  private readonly objetos = new Map<string, { body: Buffer; contentType: string }>();

  async put(input: PutObjectInput): Promise<{ key: string; url: string }> {
    this.objetos.set(input.key, { body: input.body, contentType: input.contentType });
    return { key: input.key, url: `memory://${input.key}` };
  }

  /** Apenas para teste/inspeção. */
  obter(key: string): { body: Buffer; contentType: string } | null {
    return this.objetos.get(key) ?? null;
  }
}
