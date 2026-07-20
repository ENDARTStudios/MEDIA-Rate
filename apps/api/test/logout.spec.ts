/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SessionService } from "../src/modules/auth/session.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

describe("Logout (T3.5/T3.6)", () => {
  let sessionService: SessionService;
  let mockSessao: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSessao = {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    };
    const prisma = { sessao: mockSessao } as unknown as PrismaService;
    sessionService = new SessionService(prisma);
  });

  describe("revokeSession()", () => {
    it("marca sessao como revoked_at (soft delete, nao fisico)", async () => {
      mockSessao.updateMany.mockResolvedValue({ count: 1 });
      const result = await sessionService.revokeSession("valid-token");

      expect(result).toBe(true);
      expect(mockSessao.updateMany).toHaveBeenCalledOnce();
      const callArg = mockSessao.updateMany.mock.calls[0]![0];
      // Where: token_hash = SHA-256 do token + revoked_at IS NULL
      expect(callArg.where.token_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(callArg.where.revoked_at).toBeNull();
      // Data: revoked_at = now
      expect(callArg.data.revoked_at).toBeInstanceOf(Date);
      // Não deleteMany — mantém registro para auditoria
      expect(mockSessao.deleteMany).not.toHaveBeenCalled();
    });

    it("retorna false se sessao ja revogada ou inexistente", async () => {
      mockSessao.updateMany.mockResolvedValue({ count: 0 });
      const result = await sessionService.revokeSession("invalid-or-revoked");
      expect(result).toBe(false);
    });

    it("apos revoke, validateToken retorna null", async () => {
      mockSessao.updateMany.mockResolvedValue({ count: 1 });
      await sessionService.revokeSession("token");

      // Simula que sessao agora está revogada
      mockSessao.findUnique.mockResolvedValue({
        id: "s1",
        usuario_id: "u1",
        token_hash: "hash",
        expires_at: new Date(Date.now() + 1000),
        revoked_at: new Date(), // revogada
        usuario: { id: "u1", email: "u@e.com", nome: "U" },
      });
      const valid = await sessionService.validateToken("token");
      expect(valid).toBeNull();
    });
  });

  describe("cleanupExpired()", () => {
    it("deleta sessoes expiradas E revogadas (job de limpeza)", async () => {
      mockSessao.deleteMany.mockResolvedValue({ count: 42 });
      const result = await sessionService.cleanupExpired();
      expect(result).toBe(42);
      const callArg = mockSessao.deleteMany.mock.calls[0]![0];
      expect(callArg.where.expires_at.lt).toBeInstanceOf(Date);
      expect(callArg.where.revoked_at.not).toBeNull();
    });
  });
});
