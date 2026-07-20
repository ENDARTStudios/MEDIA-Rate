import { Injectable } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto";

/**
 * Servico de criptografia de coluna para dados pessoais LGPD (T2.6).
 *
 * Estrategia: AES-256-GCM em nivel de aplicacao. A chave vem de
 * COLUMN_ENCRYPTION_KEY env (definida em .env.example). O PostgreSQL
 * armazena apenas o ciphertext + IV + authTag, nunca o plaintext.
 *
 * Formato do valor criptografado (string base64): <iv>:<authTag>:<ciphertext>
 * - IV: 12 bytes (recomendado GCM), gerado aleatoriamente por operacao.
 * - authTag: 16 bytes (GCM default).
 * - ciphertext: payload AES-256-GCM.
 *
 * Aplicabilidade (DISCOVERY-02 Q4):
 * - Preferencias de gosto do usuario (PreferenciaUsuario.preferencias_blob).
 * - Watchlists (WatchlistEntry — protegido por modularidade).
 * - Historico de consumo (UsuarioMidiaInteracao.comentario quando sensivel).
 * - Dados de perfil para recomendacao.
 *
 * Nota: o pgcrypto PostgreSQL e uma alternativa, mas movers a chave para
 * o DB reduz a postura de seguranca. Esta implementacao mantem a chave
 * apenas no servidor de aplicacao (secret manager nativo da plataforma).
 */
@Injectable()
export class ColumnEncryptionService {
  private readonly key: Buffer;

  constructor() {
    const keyEnv = process.env.COLUMN_ENCRYPTION_KEY;
    if (!keyEnv) {
      throw new Error(
        "COLUMN_ENCRYPTION_KEY ausente. Defina no .env (gere com: openssl rand -base64 32).",
      );
    }
    // Chave AES-256 = 32 bytes. Decodifica base64.
    const keyBuffer = Buffer.from(keyEnv, "base64");
    if (keyBuffer.length !== 32) {
      throw new Error(
        `COLUMN_ENCRYPTION_KEY deve ter 32 bytes apos base64-decode (atual: ${keyBuffer.length}).`,
      );
    }
    this.key = keyBuffer;
  }

  /**
   * Criptografa um plaintext.
   * @returns string base64 no formato <iv>:<authTag>:<ciphertext>
   */
  encrypt(plaintext: string): string {
    if (typeof plaintext !== "string") {
      throw new Error("Plaintext deve ser string.");
    }
    const iv = randomBytes(12);
    const cipher: CipherGCM = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
  }

  /**
   * Descriptografa um valor criptografado.
   * @throws Error se o valor for invalido ou authTag nao conferir (tampering).
   */
  decrypt(encrypted: string): string {
    if (typeof encrypted !== "string" || encrypted.length === 0) {
      throw new Error("Valor criptografado invalido.");
    }
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      throw new Error("Formato invalido (esperado <iv>:<authTag>:<ciphertext>).");
    }
    const ivB64 = parts[0];
    const authTagB64 = parts[1];
    const ciphertextB64 = parts[2];
    if (!ivB64 || !authTagB64 || !ciphertextB64) {
      throw new Error("Partes do valor criptografado ausentes.");
    }
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher: DecipherGCM = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  }

  /**
   * Verifica se um valor parece estar criptografado (formato).
   * Usado para evitar dupla criptografia.
   *
   * Heuristica: 3 parts base64, IV com 12 bytes (16 chars b64), authTag
   * com 16 bytes (24 chars b64), ciphertext com pelo menos 1 byte.
   */
  isEncrypted(value: string): boolean {
    if (typeof value !== "string") return false;
    const parts = value.split(":");
    if (parts.length !== 3) return false;
    const ivB64 = parts[0];
    const authTagB64 = parts[1];
    const ciphertextB64 = parts[2];
    if (!ivB64 || !authTagB64 || !ciphertextB64) return false;
    // IV: 12 bytes -> 16 chars base64 (sem padding).
    if (ivB64.length !== 16) return false;
    // authTag: 16 bytes -> 24 chars base64 (sem padding).
    if (authTagB64.length !== 24) return false;
    // ciphertext: pelo menos 1 byte.
    if (ciphertextB64.length < 1) return false;
    // Regex base64 (chars validos).
    const b64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!b64Regex.test(ivB64) || !b64Regex.test(authTagB64) || !b64Regex.test(ciphertextB64)) {
      return false;
    }
    return true;
  }
}
