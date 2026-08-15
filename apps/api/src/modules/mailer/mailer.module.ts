import { Injectable, Logger, Module } from "@nestjs/common";
import { appendFileSync } from "node:fs";
import * as path from "node:path";
import {
  MailerService,
  MAIL_TRANSPORT,
  type MailMessage,
  type MailTransport,
} from "./mailer.service.js";
import { MailTemplateService } from "./mail-template.service.js";

/**
 * T341 — transporte mock (default). NUNCA envia email real:
 * - Fora de produção: grava em dev-mailbox.log (caixa de entrada de teste,
 *   gitignored — não é log de servidor).
 * - Em produção: apenas loga (sem provedor SMTP configurado). Trocar por um
 *   transport SMTP real é feito injetando outro MailTransport, sem tocar no
 *   MailerService.
 *
 * SEGURANÇA: não grava corpo completo nem PII — só destinatário + assunto.
 */
@Injectable()
export class MockMailTransport implements MailTransport {
  private readonly logger = new Logger(MockMailTransport.name);

  async send(message: MailMessage): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      try {
        const arquivo = path.join(process.cwd(), "dev-mailbox.log");
        // T342: dev-mailbox.log É a "caixa de entrada" mock (não um log de
        // servidor) — por isso grava o corpo do email (onde vive o token de
        // verificação/reset). O logger do servidor abaixo NÃO grava o corpo.
        appendFileSync(
          arquivo,
          `[${new Date().toISOString()}] para=${message.to} assunto=${message.subject} corpo=${message.text}\n`,
          "utf8",
        );
      } catch {
        this.logger.warn("Nao foi possivel gravar dev-mailbox.log (mock mailer).");
      }
    }
    this.logger.log(`[mail-mock] para=${message.to} assunto=${message.subject}`);
  }
}

@Module({
  providers: [
    MailTemplateService,
    MailerService,
    { provide: MAIL_TRANSPORT, useClass: MockMailTransport },
  ],
  exports: [MailerService],
})
export class MailerModule {}
