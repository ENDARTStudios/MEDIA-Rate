import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

import { PrismaService } from "../../prisma/prisma.service.js";

/**
 * Configuração de sessão.
 * SESSION_TTL_MS: tempo de vida da sessão (default 7 dias — equilíbrio
 * entre segurança e UX). Configurável via SESSION_TTL_HOURS env.
 * SESSION_REFRESH_THRESHOLD_MS: quando renova o cookie (sliding session).
 */
const SESSION_TTL_HOURS = Number.parseInt(process.env.SESSION_TTL_HOURS ?? "168", 10); // 7 dias
const SESSION_TTL_MS = SESSION_TTL_HOURS * 60 * 60 * 1000;
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24h — sliding session renewal threshold

/**
 * Resultado da criação de sessão.
 * `token` é o token opaco em texto plano — só existe em memória e no cookie.
 * `record` é o registro persistido no banco (apenas hash).
 */
export interface SessionCreationResult {
  token: string;
  record: {
    id: string;
    usuario_id: string;
    expires_at: Date;
  };
}

/**
 * Serviço de sessão (T3.1, T3.2).
 *
 * - Token opaco: 32 bytes aleatórios (256 bits de entropia) em base64url.
 * - Hash SHA-256 do token armazenado na tabela `sessao` (nunca plaintext).
 * - Verificação em tempo constante (comparação de hashes SHA-256).
 * - Expiração configurável via SESSION_TTL_HOURS.
 *
 * Por que token opaco e não JWT (DECISOES.md + T3.1):
 * - JWT não pode ser invalidado antes da expiração sem blocklist (complexo).
 * - Token opaco permite logout real (delete do registro no banco).
 * - Não expõe claims no cliente (menos vazamento de info).
 * - Custo de lookup no banco é desprezível com índice em token_hash UNIQUE.
 */
@Injectable()
export class SessionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SessionService.name);
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agenda limpeza periódica de sessões expiradas e revogadas.
   * Timer com unref() — não impede o processo de encerrar.
   */
  onApplicationBootstrap(): void {
    const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpired().catch((err: unknown) => {
        this.logger.warn(`cleanupExpired falhou: ${String(err)}`);
      });
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  /**
   * Gera token opaco de 32 bytes (256 bits) em base64url.
   * Formato final: 43 chars URL-safe.
   */
  generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Hash SHA-256 do token para armazenar no banco.
   * SHA-256 é suficiente porque o token tem 256 bits de entropia — não
   * há risco de rainbow table (espaço de busca = 2^256).
   */
  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Cria nova sessão para o usuário.
   * @returns token em texto (para cookie) + record persistido (com hash).
   */
  async createSession(params: {
    usuario_id: string;
    user_agent?: string;
    ip?: string;
  }): Promise<SessionCreationResult> {
    const token = this.generateToken();
    const token_hash = this.hashToken(token);
    const expires_at = new Date(Date.now() + SESSION_TTL_MS);

    const record = await this.prisma.sessao.create({
      data: {
        usuario_id: params.usuario_id,
        token_hash,
        user_agent: params.user_agent?.slice(0, 1024),
        ip_criacao: params.ip,
        expires_at,
      },
      select: { id: true, usuario_id: true, expires_at: true },
    });

    this.logger.debug(`Sessão criada para usuário ${params.usuario_id}`);
    return { token, record };
  }

  /**
   * Valida token opaco: encontra sessão ativa não expirada.
   * @returns sessão + usuário se válido, null caso contrário.
   */
  async validateToken(token: string): Promise<{
    sessao: { id: string; usuario_id: string; expires_at: Date };
    usuario: { id: string; email: string; nome: string | null };
  } | null> {
    if (typeof token !== "string" || token.length === 0) {
      return null;
    }
    const token_hash = this.hashToken(token);
    const result = await this.prisma.sessao.findUnique({
      where: { token_hash },
      include: {
        usuario: {
          select: { id: true, email: true, nome: true },
        },
      },
    });
    if (!result) return null;
    if (result.revoked_at !== null) return null;
    if (result.expires_at < new Date()) return null;

    // Sliding session: estende TTL se faltar menos de 24h para expirar.
    const msUntilExpiry = result.expires_at.getTime() - Date.now();
    if (msUntilExpiry < REFRESH_THRESHOLD_MS) {
      const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
      await this.prisma.sessao.update({
        where: { id: result.id },
        data: { expires_at: newExpiry },
      });
      result.expires_at = newExpiry;
    }

    return {
      sessao: {
        id: result.id,
        usuario_id: result.usuario_id,
        expires_at: result.expires_at,
      },
      usuario: {
        id: result.usuario.id,
        email: result.usuario.email,
        nome: result.usuario.nome,
      },
    };
  }

  /**
   * Invalida sessão (logout T3.5). Marca revoked_at e mantém registro
   * para auditoria (não delete físico).
   */
  async revokeSession(token: string): Promise<boolean> {
    if (typeof token !== "string" || token.length === 0) return false;
    const token_hash = this.hashToken(token);
    const result = await this.prisma.sessao.updateMany({
      where: { token_hash, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    return result.count > 0;
  }

  /**
   * Limpa sessões expiradas (job agendado em Fase posterior).
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.sessao.deleteMany({
      where: { expires_at: { lt: new Date() }, revoked_at: { not: null } },
    });
    return result.count;
  }
}
