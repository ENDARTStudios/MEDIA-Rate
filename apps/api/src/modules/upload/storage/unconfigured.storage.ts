import { HttpException, HttpStatus } from "@nestjs/common";
import type { PutObjectInput, StorageAdapter } from "./storage.port.js";

/**
 * T457 — adapter FAIL-CLOSED: usado em PRODUÇÃO quando as env R2 estão
 * ausentes. NÃO persiste nada — qualquer `put` falha com 503 claro, evitando
 * a perda silenciosa de assets que ocorria ao cair em InMemoryStorage.
 */
export class UnconfiguredStorage implements StorageAdapter {
  readonly kind = "unconfigured" as const;

  async put(_input: PutObjectInput): Promise<{ key: string; url: string }> {
    throw new HttpException(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: "STORAGE_UNAVAILABLE",
        code: "STORAGE_UNAVAILABLE",
        message: "Armazenamento de assets não configurado. Contate o administrador.",
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
