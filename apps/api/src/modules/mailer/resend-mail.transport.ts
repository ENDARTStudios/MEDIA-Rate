import { Injectable, Logger } from "@nestjs/common";
import type { MailMessage, MailTransport } from "./mailer.service.js";

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * T348 — transporte real de email via Resend (HTTP API).
 *
 * - Lê a chave da env (RESEND_API_KEY) — NUNCA em código/commit/log.
 * - Usa fetch nativo (Node 18+), sem dependência nova.
 * - Em erro, lança sem logar o corpo da resposta (pode conter detalhes do
 *   provedor); o logger só grava destinatário + assunto (nunca PII/token).
 * - Selecionado em produção pelo MailerModule apenas quando MAIL_PROVIDER=resend
 *   e RESEND_API_KEY está presente; caso contrário, MockMailTransport.
 */
@Injectable()
export class ResendMailTransport implements MailTransport {
  private readonly logger = new Logger(ResendMailTransport.name);

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend devolveu HTTP ${response.status}.`);
    }
    this.logger.log(`[mail-resend] para=${message.to} assunto=${message.subject}`);
  }
}
