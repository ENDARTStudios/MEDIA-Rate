import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ColumnEncryptionService } from "../src/common/column-encryption.service.js";

describe("ColumnEncryptionService (T2.6)", () => {
  let originalKey: string | undefined;
  let svc: ColumnEncryptionService;

  beforeEach(() => {
    originalKey = process.env.COLUMN_ENCRYPTION_KEY;
    // Chave AES-256 (32 bytes) em base64.
    process.env.COLUMN_ENCRYPTION_KEY = Buffer.from(
      "0123456789abcdef0123456789abcdef",
      "utf8",
    ).toString("base64");
    svc = new ColumnEncryptionService();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.COLUMN_ENCRYPTION_KEY;
    else process.env.COLUMN_ENCRYPTION_KEY = originalKey;
  });

  describe("constructor", () => {
    it("lanc erro se COLUMN_ENCRYPTION_KEY ausente", () => {
      delete process.env.COLUMN_ENCRYPTION_KEY;
      expect(() => new ColumnEncryptionService()).toThrow(/COLUMN_ENCRYPTION_KEY ausente/);
    });

    it("lanc erro se chave nao tem 32 bytes", () => {
      process.env.COLUMN_ENCRYPTION_KEY = Buffer.from("chave-curta", "utf8").toString("base64");
      expect(() => new ColumnEncryptionService()).toThrow(/32 bytes/);
    });

    it("aceita chave base64 de 32 bytes", () => {
      process.env.COLUMN_ENCRYPTION_KEY = Buffer.alloc(32, 0x42).toString("base64");
      expect(() => new ColumnEncryptionService()).not.toThrow();
    });
  });

  describe("encrypt() + decrypt()", () => {
    it("round-trip: decrypt(encrypt(x)) === x", () => {
      const original = "preferencias do usuario: acao, ficcao, drama";
      const encrypted = svc.encrypt(original);
      const decrypted = svc.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("encrypt gera saida diferente do plaintext", () => {
      const encrypted = svc.encrypt("dado sensivel");
      expect(encrypted).not.toContain("dado");
      expect(encrypted).not.toContain("sensivel");
    });

    it("encrypt gera IV aleatorio (saidas diferentes para mesmo input)", () => {
      const e1 = svc.encrypt("mesmo input");
      const e2 = svc.encrypt("mesmo input");
      expect(e1).not.toBe(e2);
      // Mas ambos decriptam para o mesmo valor.
      expect(svc.decrypt(e1)).toBe("mesmo input");
      expect(svc.decrypt(e2)).toBe("mesmo input");
    });

    it("decrypt retorna UTF-8 corretamente (acentos, emoji)", () => {
      const original = "Preferências: ação, ficção — ãéíóú 🎬🎮📚";
      const encrypted = svc.encrypt(original);
      const decrypted = svc.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("lanc erro se plaintext nao for string", () => {
      // @ts-expect-error testando entrada invalida
      expect(() => svc.encrypt(null)).toThrow(/string/);
      // @ts-expect-error testando entrada invalida
      expect(() => svc.encrypt(123)).toThrow(/string/);
    });

    it("lanc erro se valor criptografado for vazio", () => {
      expect(() => svc.decrypt("")).toThrow(/invalido/);
    });

    it("lanc erro se formato for invalido (sem 3 partes)", () => {
      expect(() => svc.decrypt("nao-valido")).toThrow(/Formato invalido/);
      expect(() => svc.decrypt("a:b")).toThrow(/Formato invalido/);
      expect(() => svc.decrypt("a:b:c:d")).toThrow(/Formato invalido/);
    });

    it("lanc erro se authTag nao conferir (tampering detectado)", () => {
      const encrypted = svc.encrypt("dado sensivel");
      // Modifica um byte do ciphertext para simular tampering.
      const parts = encrypted.split(":");
      const ciphertextPart = parts[2];
      if (!ciphertextPart) throw new Error("test setup failed: no ciphertext part");
      const tamperedCiphertext = Buffer.from(ciphertextPart, "base64");
      const firstByte = tamperedCiphertext[0];
      if (firstByte === undefined) throw new Error("test setup failed: empty ciphertext");
      tamperedCiphertext[0] = (firstByte + 1) % 256;
      parts[2] = tamperedCiphertext.toString("base64");
      const tampered = parts.join(":");
      expect(() => svc.decrypt(tampered)).toThrow();
    });

    it("lanc erro se chave mudou apos encrypt (nao descripta)", () => {
      const encrypted = svc.encrypt("dado");
      // Cria novo service com chave diferente.
      process.env.COLUMN_ENCRYPTION_KEY = Buffer.alloc(32, 0x99).toString("base64");
      const newSvc = new ColumnEncryptionService();
      expect(() => newSvc.decrypt(encrypted)).toThrow();
    });
  });

  describe("isEncrypted()", () => {
    it("retorna true para valor criptografado", () => {
      const encrypted = svc.encrypt("dado");
      expect(svc.isEncrypted(encrypted)).toBe(true);
    });

    it("retorna false para plaintext", () => {
      expect(svc.isEncrypted("dado sensivel")).toBe(false);
      expect(svc.isEncrypted("")).toBe(false);
      expect(svc.isEncrypted("a:b:c")).toBe(false); // parts nao sao base64 valido
    });

    it("evita dupla criptografia", () => {
      const original = "dado";
      const once = svc.encrypt(original);
      // Aplicacao pratica: antes de encrypt, checa isEncrypted.
      if (!svc.isEncrypted(once)) {
        // Nao deve entrar aqui.
        throw new Error("isEncrypted deveria retornar true");
      }
      // uma vez criptografado, manter.
      expect(svc.decrypt(once)).toBe(original);
    });
  });
});
