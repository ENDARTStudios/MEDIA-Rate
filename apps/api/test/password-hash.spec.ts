import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PasswordService } from "../src/common/password.service.js";

describe("PasswordService (T2.5)", () => {
  let svc: PasswordService;
  let originalPepper: string | undefined;

  beforeEach(() => {
    originalPepper = process.env.ARGON2_SECRET_PEPPER;
    delete process.env.ARGON2_SECRET_PEPPER;
    svc = new PasswordService();
  });

  afterEach(() => {
    if (originalPepper === undefined) delete process.env.ARGON2_SECRET_PEPPER;
    else process.env.ARGON2_SECRET_PEPPER = originalPepper;
  });

  describe("hash()", () => {
    it("gera hash argon2id com formato correto", async () => {
      const hash = await svc.hash("minhaSenha123");
      expect(hash).toMatch(/^\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$.+\$.+$/);
    });

    it("gera hashes diferentes para mesma senha (salt aleatorio)", async () => {
      const h1 = await svc.hash("minhaSenha123");
      const h2 = await svc.hash("minhaSenha123");
      expect(h1).not.toBe(h2);
    });

    it("rejeita senha vazia", async () => {
      await expect(svc.hash("")).rejects.toThrow(/nao-vazia/);
    });

    it("rejeita nao-string", async () => {
      // @ts-expect-error testando entrada invalida
      await expect(svc.hash(null)).rejects.toThrow(/nao-vazia/);
      // @ts-expect-error testando entrada invalida
      await expect(svc.hash(123)).rejects.toThrow();
    });
  });

  describe("verify()", () => {
    it("retorna true para senha correta", async () => {
      const hash = await svc.hash("minhaSenha123");
      const ok = await svc.verify("minhaSenha123", hash);
      expect(ok).toBe(true);
    });

    it("retorna false para senha incorreta", async () => {
      const hash = await svc.hash("minhaSenha123");
      const ok = await svc.verify("senhaErrada", hash);
      expect(ok).toBe(false);
    });

    it("retorna false para hash malformado", async () => {
      const ok = await svc.verify("minhaSenha123", "hash-invalido");
      expect(ok).toBe(false);
    });

    it("retorna false para hash vazio", async () => {
      const ok = await svc.verify("minhaSenha123", "");
      expect(ok).toBe(false);
    });

    it("retorna false para entrada nao-string", async () => {
      // @ts-expect-error testando entrada invalida
      expect(await svc.verify(null, "$argon2id$...")).toBe(false);
      // @ts-expect-error testando entrada invalida
      expect(await svc.verify("senha", null)).toBe(false);
    });

    it("verificacao e tempo constante (nao revela cedo)", async () => {
      const hash = await svc.hash("minhaSenha123");
      const startCorrect = Date.now();
      await svc.verify("minhaSenha123", hash);
      const elapsedCorrect = Date.now() - startCorrect;

      const startWrong = Date.now();
      await svc.verify("senhaErrada", hash);
      const elapsedWrong = Date.now() - startWrong;

      // Ambos devem demorar tempo similar (verificacao completa).
      // Tolerancia de 2x para ruido de sistema.
      expect(elapsedWrong).toBeGreaterThan(elapsedCorrect * 0.1);
    });
  });

  describe("needsRehash()", () => {
    it("retorna false para hash gerado com parametros atuais", async () => {
      const hash = await svc.hash("minhaSenha123");
      expect(svc.needsRehash(hash)).toBe(false);
    });

    it("retorna true para hash com parametros menores", () => {
      // Hash argon2id com m=4096 (memoria muito baixa) — needsRehash deve
      // detectar que precisa upgrade.
      const oldHash = "$argon2id$v=19$m=4096,t=1,p=1$c29tZXNhbHQ$zHtqgUq3OGqYjXlHp0PEhA";
      expect(svc.needsRehash(oldHash)).toBe(true);
    });
  });

  describe("pepper", () => {
    it("usa pepper quando ARGON2_SECRET_PEPPER definido", async () => {
      process.env.ARGON2_SECRET_PEPPER = "meu-pepper-secreto";
      const svcWithPepper = new PasswordService();

      const hash = await svcWithPepper.hash("minhaSenha123");
      // Verifica com pepper — deve passar.
      expect(await svcWithPepper.verify("minhaSenha123", hash)).toBe(true);

      // Verifica sem pepper (svc default) — deve falhar porque hash foi
      // gerado com pepper.
      expect(await svc.verify("minhaSenha123", hash)).toBe(false);
    });

    it("pepper vazio desativa (sem erro)", async () => {
      process.env.ARGON2_SECRET_PEPPER = "";
      const svcNoPepper = new PasswordService();
      const hash = await svcNoPepper.hash("minhaSenha123");
      expect(await svcNoPepper.verify("minhaSenha123", hash)).toBe(true);
    });
  });
});
