/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LgpdService } from "../src/modules/lgpd/lgpd.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

function createMockPrisma() {
  const mocks = {
    usuario: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    usuarioPapel: { findMany: vi.fn() },
    usuarioPlano: { findUnique: vi.fn() },
    consentimentoUsuario: { findMany: vi.fn() },
    watchlistEntry: { findMany: vi.fn() },
    usuarioMidiaInteracao: { findMany: vi.fn() },
    preferenciaUsuario: { findUnique: vi.fn() },
    sessao: { findMany: vi.fn(), updateMany: vi.fn() },
    eventoPagamento: { findMany: vi.fn() },
  };
  return { prisma: mocks as unknown as PrismaService, mocks };
}

describe("LgpdService (T4.9)", () => {
  let svc: LgpdService;
  let mock: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mock = createMockPrisma();
    svc = new LgpdService(mock.prisma);
  });

  describe("exportarDados()", () => {
    it("retorna JSON com todos os dados pessoais do titular", async () => {
      mock.mocks.usuario.findUnique.mockResolvedValue({
        id: "u1",
        email: "user@example.com",
        nome: "User",
        email_verificado_em: new Date(),
        ultimo_login_em: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
      mock.mocks.usuarioPapel.findMany.mockResolvedValue([{ papel: { nome: "USER" } }]);
      mock.mocks.usuarioPlano.findUnique.mockResolvedValue({
        plano: "FREE",
        status: "ATIVA",
        current_period_end: null,
        created_at: new Date(),
      });
      mock.mocks.consentimentoUsuario.findMany.mockResolvedValue([]);
      mock.mocks.watchlistEntry.findMany.mockResolvedValue([]);
      mock.mocks.usuarioMidiaInteracao.findMany.mockResolvedValue([]);
      mock.mocks.preferenciaUsuario.findUnique.mockResolvedValue(null);
      mock.mocks.sessao.findMany.mockResolvedValue([]);
      mock.mocks.eventoPagamento.findMany.mockResolvedValue([]);

      const result = await svc.exportarDados("u1");

      expect(result.usuario_id).toBe("u1");
      expect(result.dados.perfil).toMatchObject({ id: "u1", email: "user@example.com" });
      expect(result.dados.papeis).toHaveLength(1);
      expect(result.dados.plano).toMatchObject({ plano: "FREE" });
      expect(result.dados.consentimentos).toEqual([]);
      expect(result.dados.watchlist).toEqual([]);
      expect(result.dados.interacoes).toEqual([]);
      expect(result.dados.preferencias).toBeNull();
      expect(result.dados.sessoes_ativas).toEqual([]);
      expect(result.dados.eventos_pagamento).toEqual([]);
      expect(result.gerado_em).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("NÃO inclui password_hash no perfil exportado", async () => {
      mock.mocks.usuario.findUnique.mockResolvedValue({
        id: "u1",
        email: "user@example.com",
        nome: "User",
      });
      mock.mocks.usuarioPapel.findMany.mockResolvedValue([]);
      mock.mocks.usuarioPlano.findUnique.mockResolvedValue(null);
      mock.mocks.consentimentoUsuario.findMany.mockResolvedValue([]);
      mock.mocks.watchlistEntry.findMany.mockResolvedValue([]);
      mock.mocks.usuarioMidiaInteracao.findMany.mockResolvedValue([]);
      mock.mocks.preferenciaUsuario.findUnique.mockResolvedValue(null);
      mock.mocks.sessao.findMany.mockResolvedValue([]);
      mock.mocks.eventoPagamento.findMany.mockResolvedValue([]);

      const result = await svc.exportarDados("u1");

      // select explicit não inclui password_hash
      const findUniqueCall = mock.mocks.usuario.findUnique.mock.calls[0]![0];
      expect(findUniqueCall.select.password_hash).toBeUndefined();
      // Perfil retornado não tem password_hash
      expect(JSON.stringify(result.dados.perfil)).not.toContain("password_hash");
    });

    it("NÃO inclui stripe_subscription_id no plano exportado (PII financeira)", async () => {
      mock.mocks.usuario.findUnique.mockResolvedValue({ id: "u1", email: "e" });
      mock.mocks.usuarioPapel.findMany.mockResolvedValue([]);
      mock.mocks.usuarioPlano.findUnique.mockResolvedValue({ plano: "PLUS" });
      mock.mocks.consentimentoUsuario.findMany.mockResolvedValue([]);
      mock.mocks.watchlistEntry.findMany.mockResolvedValue([]);
      mock.mocks.usuarioMidiaInteracao.findMany.mockResolvedValue([]);
      mock.mocks.preferenciaUsuario.findUnique.mockResolvedValue(null);
      mock.mocks.sessao.findMany.mockResolvedValue([]);
      mock.mocks.eventoPagamento.findMany.mockResolvedValue([]);

      const result = await svc.exportarDados("u1");

      const findUniqueCall = mock.mocks.usuarioPlano.findUnique.mock.calls[0]![0];
      expect(findUniqueCall.select.stripe_subscription_id).toBeUndefined();
      expect(JSON.stringify(result.dados.plano)).not.toContain("stripe_subscription_id");
    });

    it("lança erro se usuário não existe", async () => {
      mock.mocks.usuario.findUnique.mockResolvedValue(null);
      await expect(svc.exportarDados("inexistente")).rejects.toThrow();
    });
  });

  describe("solicitarExclusao()", () => {
    it("agenda soft delete +30 dias e revoga sessões ativas", async () => {
      mock.mocks.usuario.findUnique.mockResolvedValue({ dados_para_exclusao_at: null });
      mock.mocks.usuario.update.mockResolvedValue({});
      mock.mocks.sessao.updateMany.mockResolvedValue({ count: 3 });

      const result = await svc.solicitarExclusao("u1", "não quero mais");

      expect(result.dias_para_cancelar).toBe(30);
      expect(result.agendado_para).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // update seta dados_para_exclusao_at
      const updateCall = mock.mocks.usuario.update.mock.calls[0]![0];
      expect(updateCall.where.id).toBe("u1");
      expect(updateCall.data.dados_para_exclusao_at).toBeInstanceOf(Date);
      // Sessões revogadas
      expect(mock.mocks.sessao.updateMany).toHaveBeenCalledOnce();
      const sessaoCall = mock.mocks.sessao.updateMany.mock.calls[0]![0];
      expect(sessaoCall.where.usuario_id).toBe("u1");
      expect(sessaoCall.where.revoked_at).toBeNull();
      expect(sessaoCall.data.revoked_at).toBeInstanceOf(Date);
    });

    it("lança ConflictException se exclusão já agendada", async () => {
      mock.mocks.usuario.findUnique.mockResolvedValue({
        dados_para_exclusao_at: new Date("2026-08-01"),
      });

      await expect(svc.solicitarExclusao("u1")).rejects.toThrow();
    });

    it("lança erro se usuário não existe", async () => {
      mock.mocks.usuario.findUnique.mockResolvedValue(null);
      await expect(svc.solicitarExclusao("inexistente")).rejects.toThrow();
    });
  });

  describe("cancelarExclusao()", () => {
    it("limpa dados_para_exclusao_at e retorna true se cancelou", async () => {
      mock.mocks.usuario.updateMany.mockResolvedValue({ count: 1 });
      const result = await svc.cancelarExclusao("u1");
      expect(result.cancelado).toBe(true);
      const callArg = mock.mocks.usuario.updateMany.mock.calls[0]![0];
      expect(callArg.where.id).toBe("u1");
      expect(callArg.where.dados_para_exclusao_at.not).toBeNull();
      expect(callArg.data.dados_para_exclusao_at).toBeNull();
    });

    it("retorna false se não havia exclusão agendada", async () => {
      mock.mocks.usuario.updateMany.mockResolvedValue({ count: 0 });
      const result = await svc.cancelarExclusao("u1");
      expect(result.cancelado).toBe(false);
    });
  });
});
