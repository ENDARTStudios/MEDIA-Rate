import { Injectable, Logger, ConflictException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";

/**
 * Serviço LGPD (T4.9 — direitos do titular).
 *
 * - exportarDados(): coleta todos os dados pessoais do usuário em JSON.
 * - solicitarExclusao(): agenda soft delete em dados_para_exclusao_at (+30 dias).
 *
 * Logs de auditoria retidos por 6 anos (Recomendação ANPD) — implementar
 * em tarefa futura (tabela `auditoria_lgpd`).
 */
const EXCLUSAO_DELAY_DIAS = 30;

@Injectable()
export class LgpdService {
  private readonly logger = new Logger(LgpdService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Exporta todos os dados pessoais do titular (T4.9).
   *
   * Entrega: JSON imediato se < 5MB (limite prático para resposta HTTP).
   * Em produção com > 5MB, migrar para job assíncrono + email (T4.9 pede).
   */
  async exportarDados(usuario_id: string): Promise<{
    usuario_id: string;
    gerado_em: string;
    dados: {
      perfil: unknown;
      papeis: unknown[];
      plano: unknown;
      consentimentos: unknown[];
      watchlist: unknown[];
      interacoes: unknown[];
      preferencias: unknown | null;
      sessoes_ativas: unknown[];
      eventos_pagamento: unknown[];
    };
  }> {
    const [
      usuario,
      papeis,
      plano,
      consentimentos,
      watchlist,
      interacoes,
      preferencias,
      sessoes,
      eventos,
    ] = await Promise.all([
      this.prisma.usuario.findUnique({
        where: { id: usuario_id },
        select: {
          id: true,
          email: true,
          nome: true,
          email_verificado_em: true,
          termos_aceitos_em: true,
          ultimo_login_em: true,
          created_at: true,
          updated_at: true,
          // NÃO incluir password_hash nem dados_para_exclusao_at.
        },
      }),
      this.prisma.usuarioPapel.findMany({
        where: { usuario_id },
        include: { papel: { select: { nome: true } } },
      }),
      this.prisma.usuarioPlano.findUnique({
        where: { usuario_id },
        select: {
          plano: true,
          status: true,
          current_period_end: true,
          created_at: true,
          // NÃO incluir stripe_subscription_id (PII financeira).
        },
      }),
      this.prisma.consentimentoUsuario.findMany({
        where: { usuario_id },
        select: {
          finalidade: true,
          consentido_em: true,
          revogado_em: true,
          texto_versao: true,
          ip_aceite: true,
        },
      }),
      this.prisma.watchlistEntry.findMany({
        where: { usuario_id },
      }),
      this.prisma.usuarioMidiaInteracao.findMany({
        where: { usuario_id },
        include: { midia: { select: { id: true, titulo: true } } },
      }),
      this.prisma.preferenciaUsuario.findUnique({
        where: { usuario_id },
        select: { versao: true, updated_at: true },
      }),
      this.prisma.sessao.findMany({
        where: { usuario_id, revoked_at: null },
        select: {
          id: true,
          user_agent: true,
          ip_criacao: true,
          expires_at: true,
          created_at: true,
        },
      }),
      this.prisma.eventoPagamento.findMany({
        where: { usuario_id },
        select: {
          tipo: true,
          processado_em: true,
          resultado: true,
        },
      }),
    ]);

    if (!usuario) {
      throw new ConflictException("Usuário não encontrado.");
    }

    this.logger.log(`Exportação LGPD solicitada por usuário ${usuario_id}`);

    return {
      usuario_id,
      gerado_em: new Date().toISOString(),
      dados: {
        perfil: usuario,
        papeis,
        plano,
        consentimentos,
        watchlist,
        interacoes,
        preferencias,
        sessoes_ativas: sessoes,
        eventos_pagamento: eventos,
      },
    };
  }

  /**
   * Solicita exclusão de dados (T4.9).
   *
   * Agenda soft delete em dados_para_exclusao_at = +30 dias.
   * Usuário pode cancelar excluindo dados_para_exclusao_at antes do prazo.
   * Após prazo, job executa DELETE em cascata (implementar em tarefa futura).
   */
  async solicitarExclusao(
    usuario_id: string,
    _motivo?: string,
  ): Promise<{
    agendado_para: string;
    dias_para_cancelar: number;
    mensagem: string;
  }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuario_id },
      select: { dados_para_exclusao_at: true },
    });

    if (!usuario) {
      throw new ConflictException("Usuário não encontrado.");
    }

    if (usuario.dados_para_exclusao_at !== null) {
      throw new ConflictException({
        statusCode: 409,
        error: "Conflict",
        message: `Exclusão já agendada para ${usuario.dados_para_exclusao_at.toISOString()}.`,
      });
    }

    const agendadoPara = new Date(Date.now() + EXCLUSAO_DELAY_DIAS * 24 * 60 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { id: usuario_id },
      data: { dados_para_exclusao_at: agendadoPara },
    });

    // Revoga todas as sessões ativas imediatamente (segurança).
    await this.prisma.sessao.updateMany({
      where: { usuario_id, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    this.logger.warn(
      `Exclusão LGPD agendada para usuário ${usuario_id} em ${agendadoPara.toISOString()}`,
    );

    return {
      agendado_para: agendadoPara.toISOString(),
      dias_para_cancelar: EXCLUSAO_DELAY_DIAS,
      mensagem: `Exclusão agendada para ${agendadoPara.toISOString()}. Você tem ${EXCLUSAO_DELAY_DIAS} dias para cancelar entrando em contato.`,
    };
  }

  /**
   * Cancela exclusão agendada (antes do prazo).
   */
  async cancelarExclusao(usuario_id: string): Promise<{ cancelado: boolean }> {
    const result = await this.prisma.usuario.updateMany({
      where: { id: usuario_id, dados_para_exclusao_at: { not: null } },
      data: { dados_para_exclusao_at: null },
    });
    return { cancelado: result.count > 0 };
  }
}
