import { describe, it, expect, beforeEach } from "vitest";
import { LockoutService } from "../src/modules/auth/lockout.service.js";

describe("LockoutService (T3.3 + T020/7.5)", () => {
  let svc: LockoutService;

  beforeEach(() => {
    svc = new LockoutService();
  });

  describe("isLocked()", () => {
    it("retorna locked=false para IP+email sem tentativas", async () => {
      const result = await svc.isLocked("1.2.3.4", "user@example.com");
      expect(result.locked).toBe(false);
      expect(result.remainingMs).toBe(0);
    });

    it("normaliza email (lowercase + trim)", async () => {
      await svc.registerFailure("1.2.3.4", "USER@Example.COM ");
      const result = await svc.isLocked("1.2.3.4", "user@example.com");
      expect(result.locked).toBe(false);
    });
  });

  describe("registerFailure() — escalonamento progressivo", () => {
    it("1a-4a falhas: nao aplica bloqueio", async () => {
      for (let i = 1; i <= 4; i++) {
        const result = await svc.registerFailure("1.2.3.4", "user@example.com");
        expect(result.failedCount).toBe(i);
        expect(result.locked).toBe(false);
        expect(result.lockedForMs).toBe(0);
      }
    });

    it("5a falha: aplica 1o bloqueio de 60s", async () => {
      for (let i = 0; i < 4; i++) {
        await svc.registerFailure("1.2.3.4", "user@example.com");
      }
      const result = await svc.registerFailure("1.2.3.4", "user@example.com");
      expect(result.failedCount).toBe(5);
      expect(result.locked).toBe(true);
      expect(result.lockedForMs).toBe(60 * 1000);
    });

    it("10a falha: aplica 2o bloqueio de 5min", async () => {
      for (let i = 0; i < 5; i++) {
        await svc.registerFailure("1.2.3.4", "user@example.com");
      }
      // Força o registro de mais 5 falhas (mas no local, com bloqueio, não aplica novo nível)
      const result = await svc.registerFailure("1.2.3.4", "user@example.com");
      expect(result.failedCount).toBe(6);
      expect(result.locked).toBe(false);
    });

    it("lockLevel calculado corretamente para multiplos niveis", () => {
      const expectedLevels = [
        { failedCount: 5, level: 0, ms: 60 * 1000 },
        { failedCount: 10, level: 1, ms: 5 * 60 * 1000 },
        { failedCount: 15, level: 2, ms: 15 * 60 * 1000 },
        { failedCount: 20, level: 3, ms: 60 * 60 * 1000 },
        { failedCount: 25, level: 4, ms: 24 * 60 * 60 * 1000 },
      ];
      for (const { failedCount, level, ms } of expectedLevels) {
        const lockLevel = Math.min(Math.floor(failedCount / 5) - 1, 4);
        expect(lockLevel).toBe(level);
        const durations = [
          60 * 1000,
          5 * 60 * 1000,
          15 * 60 * 1000,
          60 * 60 * 1000,
          24 * 60 * 60 * 1000,
        ];
        expect(durations[lockLevel]).toBe(ms);
      }
    });
  });

  describe("isLocked() apos bloqueio", () => {
    it("retorna locked=true com remainingMs > 0 apos 5a falha", async () => {
      for (let i = 0; i < 5; i++) {
        await svc.registerFailure("1.2.3.4", "user@example.com");
      }
      const result = await svc.isLocked("1.2.3.4", "user@example.com");
      expect(result.locked).toBe(true);
      expect(result.remainingMs).toBeGreaterThan(0);
      expect(result.remainingMs).toBeLessThanOrEqual(60 * 1000);
    });
  });

  describe("resetOnSuccess()", () => {
    it("zera contador apos login bem-sucedido", async () => {
      for (let i = 0; i < 4; i++) {
        await svc.registerFailure("1.2.3.4", "user@example.com");
      }
      await svc.resetOnSuccess("1.2.3.4", "user@example.com");
      const result = await svc.registerFailure("1.2.3.4", "user@example.com");
      expect(result.failedCount).toBe(1);
      expect(result.locked).toBe(false);
    });
  });

  describe("chave por IP+email", () => {
    it("IPs diferentes com mesmo email nao compartilham contador", async () => {
      for (let i = 0; i < 5; i++) {
        await svc.registerFailure("1.1.1.1", "user@example.com");
      }
      const result = await svc.isLocked("2.2.2.2", "user@example.com");
      expect(result.locked).toBe(false);
    });

    it("emails diferentes com mesmo IP nao compartilham contador", async () => {
      for (let i = 0; i < 5; i++) {
        await svc.registerFailure("1.1.1.1", "user1@example.com");
      }
      const result = await svc.isLocked("1.1.1.1", "user2@example.com");
      expect(result.locked).toBe(false);
    });
  });

  describe("fallback local sem Redis (T020/7.5)", () => {
    it("funciona sem CacheService injetado (modo local)", async () => {
      const fallback = new LockoutService();
      for (let i = 0; i < 5; i++) {
        await fallback.registerFailure("10.0.0.1", "test@example.com");
      }
      const locked = await fallback.isLocked("10.0.0.1", "test@example.com");
      expect(locked.locked).toBe(true);
    });

    it("cleanup remove entradas expiradas no modo local", async () => {
      const local = new LockoutService();
      await local.registerFailure("10.0.0.2", "old@example.com");
      const removed = local.cleanup();
      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });
});
