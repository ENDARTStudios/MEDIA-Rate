import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { MockMailService } from "../../common/mock-mail.service.js";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESEND_MAX_POR_EMAIL = 3;
const RESEND_JANELA_MS = 60 * 60 * 1000; // 1h

/**
 * EmailVerificationService (T214, Fase 3) — token de verificação opaco
 * 256-bit (SHA-256 no banco), TTL 24h, uso único.
 *
 * - verificar: valida hash+expiração, marca email_verificado_em, anula o
 *   token. Resposta SEMPRE genérica (sem enumeração de estado).
 * - reenviar: rate limit 3/h por email (janela deslizante, por instância);
 *   respostas genéricas (email inexistente/verificado não revelam estado).
 * - Token NUNCA em logs do app (apenas hash truncado; dev-mailbox.log).
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly reenvios = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly mail: MockMailService,
  ) {}

  generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /** T376: base pública do site (para montar o link de verificação). */
  private get siteUrl(): string {
    const raw = process.env.SITE_URL ?? "https://mediarate.app";
    return raw.replace(/\/+$/, "");
  }

  /**
   * Gera + persiste o token e envia o email. Retorna o token bruto.
   * T376 (D-343): o email agora leva um LINK clicável (código como fallback),
   * com locale do usuário quando conhecido (default pt-BR).
   */
  async emitirToken(usuario: { id: string; email: string }, locale = "pt-BR"): Promise<string> {
    const token = this.generateToken();
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        email_verification_token_hash: this.hashToken(token),
        email_verification_expira_em: new Date(Date.now() + VERIFY_TTL_MS),
      },
    });
    const link = `${this.siteUrl}/${locale}/verificar-email?token=${token}`;
    await this.mail.enviarVerificacaoEmail(usuario.email, token, {
      link,
      lang: locale.split("-")[0] ?? "pt",
    });
    this.logger.debug(
      `Token de verificação emitido (usuário ${usuario.id}; hash ${this.hashToken(token).slice(0, 12)})`,
    );
    return token;
  }

  /**
   * Valida o token e marca o email como verificado. Resposta genérica:
   * o chamador (controller) devolve sempre o mesmo 200.
   */
  async verificar(
    token: string,
    options: { ip?: string; user_agent?: string } = {},
  ): Promise<{ ok: boolean }> {
    if (!token) return { ok: false };
    const tokenHash = this.hashToken(token);
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        email_verification_token_hash: tokenHash,
        email_verification_expira_em: { gt: new Date() },
      },
    });
    if (!usuario) return { ok: false };

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        email_verificado_em: new Date(),
        email_verification_token_hash: null, // uso único
        email_verification_expira_em: null,
      },
    });
    await this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "EMAIL_VERIFIED",
      ipOrigem: options.ip,
      dadosDepois: { userAgent: options.user_agent },
    });
    this.logger.log(`Email verificado (usuário ${usuario.id}).`);
    return { ok: true };
  }

  /** Reenvio com rate limit 3/h por email; respostas genéricas. */
  async reenviar(
    email: string,
    options: { ip?: string; user_agent?: string; locale?: string } = {},
  ): Promise<{ message: string }> {
    this.registrarReenvio(email);

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, email: true, email_verificado_em: true },
    });
    const generico = "Se o email estiver cadastrado, um link de verificação será enviado.";

    // Email inexistente OU já verificado → resposta genérica (sem enumeração).
    if (!usuario || usuario.email_verificado_em !== null) {
      return { message: generico };
    }

    await this.emitirToken(usuario, options.locale ?? "pt-BR");
    await this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "EMAIL_VERIFICATION_RESENT",
      ipOrigem: options.ip,
      dadosDepois: { userAgent: options.user_agent },
    });
    return { message: generico };
  }

  /** Janela deslizante por email: máximo 3 reenvios na última hora. */
  private registrarReenvio(email: string): void {
    const agora = Date.now();
    const recentes = (this.reenvios.get(email) ?? []).filter((t) => agora - t < RESEND_JANELA_MS);
    if (recentes.length >= RESEND_MAX_POR_EMAIL) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests",
          message: "Muitas solicitações de reenvio. Tente novamente em uma hora.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recentes.push(agora);
    this.reenvios.set(email, recentes);
  }
}
