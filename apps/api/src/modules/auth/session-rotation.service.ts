import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service.js";
import { REFRESH_TTL_MS } from "./session.service.js";

export type RotacaoResult =
  | {
      ok: true;
      refreshToken: string;
      sessaoId: string;
      usuarioId: string;
      familyId: string;
    }
  | { ok: false; motivo: "reuso"; sessaoId: string; usuarioId: string; familyId?: string }
  | { ok: false; motivo: "invalido" };

/**
 * SessionRotationService (T212, Fase 3.3) — rotação de refresh token com
 * detecção de reuse (deixou de ser placeholder da T3.6).
 *
 * - Rotação OBRIGATÓRIA a cada uso: o hash atual vira `anterior`, um novo
 *   refresh é emitido (mesma família).
 * - REUSE DETECTION: um token já rotacionado (hash que só existe em
 *   `anterior`) sendo usado de novo indica roubo → revoga TODAS as sessões
 *   do usuário (a família agrupa as rotações).
 * - Tokens opacos 256-bit; apenas SHA-256 no banco; nunca em logs.
 */
@Injectable()
export class SessionRotationService {
  private readonly logger = new Logger(SessionRotationService.name);

  constructor(private readonly prisma: PrismaService) {}

  generateRefreshToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Rotaciona o par da sessão identificada pelo refresh token.
   * - token atual válido → novo refresh (mesma família) + novo access hash.
   * - token já rotacionado (anterior) → REUSO: revoga todas as sessões.
   * - desconhecido → inválido (401 genérico).
   */
  async rotacionarRefresh(params: {
    refreshToken: string;
    novoAccessHash?: string;
    accessExpiresAt?: Date;
  }): Promise<RotacaoResult> {
    const hash = this.hashToken(params.refreshToken);

    // 1) Token ATUAL.
    const sessao = await this.prisma.sessao.findUnique({
      where: { refresh_token_hash: hash },
    });
    if (sessao) {
      if (sessao.revoked_at !== null) {
        return { ok: false, motivo: "invalido" };
      }
      if (sessao.refresh_expira_em && sessao.refresh_expira_em < new Date()) {
        return { ok: false, motivo: "invalido" };
      }
      const novoRefresh = this.generateRefreshToken();
      const novoHash = this.hashToken(novoRefresh);
      const familia = sessao.refresh_family_id ?? randomUUID();
      await this.prisma.sessao.update({
        where: { id: sessao.id },
        data: {
          refresh_token_hash_anterior: sessao.refresh_token_hash,
          refresh_token_hash: novoHash,
          refresh_expira_em: new Date(Date.now() + REFRESH_TTL_MS),
          refresh_family_id: familia,
          // Novo access (mesma linha da sessão) — o anterior morre.
          ...(params.novoAccessHash
            ? {
                token_hash: params.novoAccessHash,
                expires_at: params.accessExpiresAt ?? new Date(Date.now() + 15 * 60 * 1000),
              }
            : {}),
        },
      });
      this.logger.log(`Refresh rotacionado (sessão ${sessao.id}; família ${familia.slice(0, 8)}…)`);
      return {
        ok: true,
        refreshToken: novoRefresh,
        sessaoId: sessao.id,
        usuarioId: sessao.usuario_id,
        familyId: familia,
      };
    }

    // 2) Token ANTERIOR → reuse (roubo provável): revoga TUDO do usuário.
    const reuso = await this.prisma.sessao.findFirst({
      where: { refresh_token_hash_anterior: hash },
    });
    if (reuso) {
      await this.prisma.sessao.updateMany({
        where: { usuario_id: reuso.usuario_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      this.logger.warn(
        `REUSE de refresh detectado (usuário ${reuso.usuario_id}; família ${String(
          reuso.refresh_family_id,
        ).slice(0, 8)}…) — todas as sessões revogadas`,
      );
      return {
        ok: false,
        motivo: "reuso",
        sessaoId: reuso.id,
        usuarioId: reuso.usuario_id,
        familyId: reuso.refresh_family_id ?? undefined,
      };
    }

    return { ok: false, motivo: "invalido" };
  }

  /** Revoga todas as sessões ativas do usuário (delete-account/reuso). */
  async revogarTodasSessoes(usuarioId: string): Promise<number> {
    const result = await this.prisma.sessao.updateMany({
      where: { usuario_id: usuarioId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    this.logger.log(`Todas as sessões do usuário ${usuarioId} revogadas (${result.count}).`);
    return result.count;
  }
}
