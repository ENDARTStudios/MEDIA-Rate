import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { Prisma } from "@prisma/client";
import { mascararIpInet, sanitizarPii } from "./pii-mask.js";

/**
 * AuditLogService — registra eventos de auditoria imutáveis (append-only)
 * com hash de cadeia para conformidade LGPD e rastreabilidade.
 *
 * hash_cadeia = SHA-256(hash_cadeia anterior + dados deste evento),
 * formando uma cadeia inquebrável. Não implementa blockchain completo —
 * é um log imutável com verificação de integridade.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private lastHash: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra um evento de auditoria com hash de cadeia.
   */
  async log(params: {
    entidade: string;
    entidadeId: string;
    acao: string;
    usuarioId?: string;
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
    ipOrigem?: string;
  }): Promise<void> {
    const anterior = await this.getUltimoHash();

    // T058/D-546: fonte ÚNICA de tempo — o mesmo `agora` alimenta o hash e o
    // `created_at` do INSERT. Elimina o drift app↔banco que causava falso-positivo
    // em `verificarIntegridade()`. Retrocompatível (sem migration; histórico intacto).
    const agora = new Date();

    const payload = JSON.stringify({
      anterior,
      entidade: params.entidade,
      entidade_id: params.entidadeId,
      acao: params.acao,
      usuario_id: params.usuarioId,
      timestamp: agora.toISOString(),
    });

    const hashCadeia = createHash("sha256").update(payload).digest("hex");

    const data: Prisma.AuditLogCreateInput = {
      entidade: params.entidade,
      entidade_id: params.entidadeId,
      acao: params.acao,
      hash_cadeia: hashCadeia,
      hash_anterior: anterior,
      created_at: agora,
    };

    // T055/D-545: minimização de PII em NOVOS registros. O `ip_origem` é
    // `@db.Inet`, então recebe uma rede coarsenada válida (não `x.x`).
    const ipMask = mascararIpInet(params.ipOrigem);
    if (ipMask) {
      data.ip_origem = ipMask;
    }

    if (params.usuarioId) {
      data.usuario_id = params.usuarioId;
    }

    if (params.dadosAntes) {
      data.dados_antes = sanitizarPii(params.dadosAntes) as Prisma.InputJsonValue;
    }

    if (params.dadosDepois) {
      data.dados_depois = sanitizarPii(params.dadosDepois) as Prisma.InputJsonValue;
    }

    await this.prisma.auditLog.create({ data });
    this.lastHash = hashCadeia;

    this.logger.debug(`Audit: ${params.acao} em ${params.entidade}/${params.entidadeId}`);
  }

  /**
   * Busca o hash da cadeia mais recente para encadear o próximo evento.
   */
  private async getUltimoHash(): Promise<string | null> {
    if (this.lastHash) return this.lastHash;

    const ultimo = await this.prisma.auditLog.findFirst({
      orderBy: { created_at: "desc" },
      select: { hash_cadeia: true },
    });

    this.lastHash = ultimo?.hash_cadeia ?? null;
    return this.lastHash;
  }

  /**
   * Verifica a integridade da cadeia de auditoria.
   * Recalcula todos os hashes e compara com os armazenados.
   * Retorna true se a cadeia está íntegra.
   */
  async verificarIntegridade(): Promise<{ integro: boolean; violacoes: number }> {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { created_at: "asc" },
    });

    let anterior: string | null = null;
    let violacoes = 0;

    for (const log of logs) {
      const payload: string = JSON.stringify({
        anterior,
        entidade: log.entidade,
        entidade_id: log.entidade_id,
        acao: log.acao,
        usuario_id: log.usuario_id,
        timestamp: log.created_at.toISOString(),
      });

      const hashEsperado: string = createHash("sha256").update(payload).digest("hex");

      if (hashEsperado !== log.hash_cadeia) {
        violacoes++;
        this.logger.warn(`Violação de integridade: ${log.id} (${log.entidade}/${log.acao})`);
      }

      anterior = log.hash_cadeia;
    }

    return { integro: violacoes === 0, violacoes };
  }
}
