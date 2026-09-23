import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { MailerService } from "../modules/mailer/mailer.service.js";
import { mascararEmail } from "./pii-mask.js";

/**
 * T342 — MockMailService como facade do mailer provider-agnostic (T341).
 *
 * Os fluxos de auth (reset de senha e verificação de email) continuam
 * injetando MockMailService (sem quebrar contrato), mas a entrega agora passa
 * pelo MailerService → MailTemplateService (escape) → MailTransport (mock).
 *
 * - Em produção, o transporte mock NÃO envia (só loga assunto/destinatário,
 *   sem corpo/token). Trocar por SMTP real é injetar outro MailTransport.
 * - Dedupe desativado (dedupeTtlMs: 0): os fluxos de auth já têm rate limit
 *   próprio (3/h) e o reenvio de um novo token não pode ser suprimido.
 * - SEGURANÇA: o TOKEN nunca vai para os logs do app — apenas o hash
 *   truncado (12 hex). O token bruto vive só no email (dev-mailbox.log, que é
 *   a "caixa de entrada" mock, não um log de servidor).
 */
@Injectable()
export class MockMailService {
  private readonly logger = new Logger(MockMailService.name);

  constructor(private readonly mailer: MailerService) {}

  private hashTruncado(token: string): string {
    return createHash("sha256").update(token).digest("hex").slice(0, 12);
  }

  async enviarResetSenha(email: string, token: string): Promise<void> {
    await this.mailer.enviar("reset_senha", email, { token }, { dedupeTtlMs: 0 });
    this.logger.debug(
      `Reset de senha (mailer): email=${mascararEmail(email)} hash_truncado=${this.hashTruncado(token)}`,
    );
  }

  /** T214/T376: envio do link de verificação de email via mailer. */
  async enviarVerificacaoEmail(
    email: string,
    token: string,
    opts: { link?: string; lang?: string } = {},
  ): Promise<void> {
    await this.mailer.enviar(
      "verificacao_email",
      email,
      { token, link: opts.link ?? "", lang: opts.lang ?? "pt" },
      { dedupeTtlMs: 0 },
    );
    this.logger.debug(
      `Verificacao de email (mailer): email=${mascararEmail(email)} hash_truncado=${this.hashTruncado(token)}`,
    );
  }
}
