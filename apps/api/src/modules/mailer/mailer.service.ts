import { Inject, Injectable, Logger } from "@nestjs/common";
import { MailTemplateService } from "./mail-template.service.js";

/**
 * T341 — MailerService provider-agnostic.
 *
 * - Depende apenas da porta MailTransport (nunca de SMTP/SDK direto).
 * - Dedupe por (destinatário + tipo) com TTL de 24h — evita envio em massa
 *   por replay de webhook.
 * - NÃO loga corpo completo nem PII (só destinatário + tipo + resultado).
 */

export const MAIL_TRANSPORT = Symbol("MAIL_TRANSPORT");

export type MailTipo = "trial_will_end" | "subscription_cancelled";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000; // 1 email do mesmo tipo por usuário/dia

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly sentKeys = new Map<string, number>();

  constructor(
    private readonly templates: MailTemplateService,
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {}

  /**
   * Renderiza + envia um email transacional (idempotente por TTL).
   * Retorna { enviado: false } quando suprimido por dedupe ou sem destinatário.
   */
  async enviar(
    tipo: MailTipo,
    destinatario: string,
    vars: Record<string, string>,
  ): Promise<{ enviado: boolean }> {
    if (!destinatario) return { enviado: false };

    const key = `${destinatario}:${tipo}`;
    const ultimo = this.sentKeys.get(key);
    if (ultimo !== undefined && ultimo > Date.now() - DEDUPE_TTL_MS) {
      this.logger.debug(`Email ${tipo} suprimido (dedupe) para ${destinatario}`);
      return { enviado: false };
    }

    const message = this.templates.render(tipo, vars);
    await this.transport.send({ to: destinatario, ...message });
    this.sentKeys.set(key, Date.now());
    this.logger.log(`Email ${tipo} enviado para ${destinatario}`);
    return { enviado: true };
  }
}
