import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  Optional,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import { createHash } from "node:crypto";
import { comContextoRls, ROLE_SERVICE } from "../../common/rls-context.js";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
  type CheckoutSession,
} from "./domain/gateway/payment-gateway.port.js";
import { WebhookSignatureError } from "./domain/gateway/payment-gateway.port.js";
import { CreateCheckoutDtoType, WebhookPayload } from "./dto/payment.dto.js";
import { MailerService } from "../mailer/mailer.service.js";

/**
 * Serviço de pagamento (T4.8 use case).
 *
 * - Depende apenas de IPaymentGateway (porta), nunca do SDK Stripe direto.
 * - createCheckout(): cria sessão no gateway + registra evento_pagamento.
 * - processWebhook(): idempotente via stripe_event_id UNIQUE (T2.10).
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  /** Trial de 7 dias no plano Plus (D-132 monetização). */
  static readonly TRIAL_DAYS_PLUS = 7;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    @Optional() private readonly mailer?: MailerService,
  ) {}

  /**
   * Cria sessão de checkout para upgrade de plano.
   * Plano PLUS inicia com trial de 7 dias (D-132) — trial único por usuário
   * (T327): se já usado, bloqueia com 409 (nunca converte em cobrança).
   */
  async createCheckout(
    dto: CreateCheckoutDtoType,
    usuario: { id: string; email: string },
  ): Promise<CheckoutSession> {
    if (dto.plano === "PLUS") {
      // T344: leitura do próprio plano sob contexto RLS (FORCE RLS).
      const plano = await comContextoRls(
        this.prisma,
        { usuarioId: usuario.id, role: "USER" },
        (tx) =>
          tx.usuarioPlano.findUnique({
            where: { usuario_id: usuario.id },
            select: { trial_used_at: true },
          }),
      );
      if (plano?.trial_used_at) {
        throw new ConflictException({
          statusCode: 409,
          error: "Conflict",
          message: "Você já utilizou o período de trial do Plus.",
          trial_already_used: true,
        });
      }
    }

    const session = await this.gateway.createCheckoutSession({
      plano: dto.plano,
      // T419 (D-389): moeda da região decidida no controller (server).
      currency: dto.currency ?? "BRL",
      customer_email: usuario.email,
      success_url: dto.success_url,
      cancel_url: dto.cancel_url,
      usuario_id: usuario.id,
      trial_period_days: dto.plano === "PLUS" ? PaymentService.TRIAL_DAYS_PLUS : undefined,
    });

    this.logger.log(
      `Checkout criado: ${session.id} para usuário ${usuario.id} (plano ${dto.plano})`,
    );
    return session;
  }

  /**
   * Processa webhook do Stripe com idempotência (T2.10 + T4.3).
   *
   * @returns true se processou, false se já tinha sido processado (idempotência).
   */
  async processWebhook(
    payload: string | Buffer,
    signature: string,
  ): Promise<{ processed: boolean; event_id: string; type: string }> {
    // 1. Verifica assinatura + constrói evento.
    //    Assinatura inválida → 400 (Stripe interpreta como rejeição e não
    //    faz retentativas; um 500 consumiria o rate limit com eventos falsos).
    let event: Awaited<ReturnType<IPaymentGateway["constructWebhookEvent"]>>;
    try {
      event = await this.gateway.constructWebhookEvent(payload, signature);
    } catch (err) {
      if (err instanceof WebhookSignatureError) {
        this.logger.warn(`Webhook rejeitado: assinatura inválida (${String(err)})`);
        throw new BadRequestException({
          statusCode: 400,
          error: "Bad Request",
          message: "Assinatura de webhook inválida.",
        });
      }
      throw err;
    }

    // 2. Idempotência: verifica se evento já foi processado.
    const existing = await this.prisma.eventoPagamento.findUnique({
      where: { stripe_event_id: event.id },
    });
    if (existing) {
      this.logger.log(`Webhook ${event.id} já processado — idempotência.`);
      return { processed: false, event_id: event.id, type: event.type };
    }

    // 3. Persiste evento (idempotência) ANTES de processar.
    // Se processamento falhar, evento fica marcado como erro mas não reprocessa.
    const payload_hash = createHash("sha256").update(payload).digest("hex");
    // T335: o objeto Stripe cru contém PII (email/nome/endereço/telefone do
    // cliente). Persistir apenas metadados não-PII; o payload_hash (SHA-256)
    // já cobre integridade/auditoria do evento bruto.
    const obj = (event.data as { object?: { object?: string; id?: string } })?.object;
    const evento = await this.prisma.eventoPagamento.create({
      data: {
        stripe_event_id: event.id,
        tipo: this.mapEventType(event.type),
        payload_hash,
        payload_raw: { object: obj?.object ?? null, id: obj?.id ?? null },
        resultado: "PROCESSANDO",
      },
    });

    // 4. Processa baseado no tipo.
    try {
      // FIX: `event.data` JÁ é o wrapper { object, previous_attributes? } do
      // Stripe. Antes, o cast direto `event.data as WebhookPayload` fazia o
      // código acessar `data.data.object` (undefined) — todos os handlers
      // eram pulados silenciosamente (SUCESSO sem sincronizar o plano).
      const raw = event.data as {
        object?: WebhookPayload["data"]["object"];
        previous_attributes?: Record<string, unknown>;
      };
      const webhookPayload: WebhookPayload = {
        type: event.type,
        data: { object: raw?.object ?? {} },
      };
      const usuarioId = webhookPayload.data.object.metadata?.usuario_id;

      switch (event.type) {
        case "checkout.session.completed":
          if (usuarioId) {
            await this.ativarAssinatura(webhookPayload, usuarioId);
          }
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
          if (usuarioId) {
            await this.sincronizarAssinatura(webhookPayload, usuarioId);
          }
          break;
        case "customer.subscription.trial_will_end":
          if (usuarioId) {
            await this.marcarTrialNotificado(usuarioId);
          }
          break;
        case "customer.subscription.deleted":
          if (usuarioId) {
            await this.cancelarAssinatura(usuarioId);
          }
          break;
        default:
          this.logger.log(`Webhook ${event.type} ignorado (não handler).`);
      }

      await this.prisma.eventoPagamento.update({
        where: { id: evento.id },
        data: { resultado: "SUCESSO" },
      });

      return { processed: true, event_id: event.id, type: event.type };
    } catch (err) {
      await this.prisma.eventoPagamento.update({
        where: { id: evento.id },
        data: {
          resultado: "ERRO",
          erro_mensagem: (err as Error).message.slice(0, 1000),
        },
      });
      throw err;
    }
  }

  /**
   * Ativa assinatura do usuário após checkout completo.
   */
  private async ativarAssinatura(payload: WebhookPayload, usuarioId: string): Promise<void> {
    const plano = payload.data.object.metadata?.plano;
    if (plano !== "PLUS" && plano !== "PREMIUM") {
      throw new BadRequestException(`Plano inválido no metadata: ${plano}`);
    }

    const subscriptionId = payload.data.object.subscription;
    const customerId = payload.data.object.customer;
    const currentPeriodEnd = payload.data.object.current_period_end;

    // D-132: trial de 7 dias no Plus — checkout.session.completed dispara no
    // início do trial; current_period_end é o fim do período grátis.
    const trialEndsAt =
      plano === "PLUS" && currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null;
    const status = trialEndsAt && trialEndsAt.getTime() > Date.now() ? "TRIALING" : "ATIVA";

    // T343: escrita de billing sob contexto RLS de serviço (prepara FORCE RLS).
    await comContextoRls(this.prisma, { usuarioId, role: ROLE_SERVICE }, async (tx) => {
      await tx.usuarioPlano.upsert({
        where: { usuario_id: usuarioId },
        create: {
          usuario_id: usuarioId,
          plano,
          status,
          stripe_subscription_id: subscriptionId ?? null,
          stripe_customer_id: customerId ?? null,
          current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
          trial_ends_at: trialEndsAt,
        },
        update: {
          plano,
          status,
          stripe_subscription_id: subscriptionId ?? undefined,
          stripe_customer_id: customerId ?? undefined,
          current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
          trial_ends_at: trialEndsAt ?? undefined,
        },
      });
    });

    // T327: trial único — marca a primeira ativação (idempotente).
    if (trialEndsAt) {
      await this.marcarTrialUsado(usuarioId);
    }

    this.logger.log(
      `Assinatura ${plano} ${status} para usuário ${usuarioId}${
        trialEndsAt ? ` (trial até ${trialEndsAt.toISOString()})` : ""
      }`,
    );
  }

  /**
   * Sincroniza a assinatura via eventos de subscription (created/updated).
   *
   * - status "trialing": registra fim do trial (trial_ends_at).
   * - status "active": trial encerrado, cobrança iniciada — limpa trial.
   */
  private async sincronizarAssinatura(payload: WebhookPayload, usuarioId: string): Promise<void> {
    const object = payload.data.object;
    const status = object.status as string | undefined;
    const plano = (object.metadata?.plano as "PLUS" | "PREMIUM" | undefined) ?? "PLUS";
    const currentPeriodEnd = object.current_period_end;

    if (status === "trialing") {
      const trialEndsAt = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null;
      // T343: escrita de billing sob contexto RLS de serviço.
      await comContextoRls(this.prisma, { usuarioId, role: ROLE_SERVICE }, async (tx) => {
        await tx.usuarioPlano.upsert({
          where: { usuario_id: usuarioId },
          create: {
            usuario_id: usuarioId,
            plano,
            status: "TRIALING",
            stripe_subscription_id: object.id ?? null,
            stripe_customer_id: (object.customer as string | null) ?? null,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
            trial_ends_at: trialEndsAt,
          },
          update: {
            plano,
            status: "TRIALING",
            stripe_subscription_id: object.id ?? undefined,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
            trial_ends_at: trialEndsAt ?? undefined,
          },
        });
      });
      // T327: trial único — marca a primeira ativação (idempotente).
      if (trialEndsAt) {
        await this.marcarTrialUsado(usuarioId);
      }
      this.logger.log(
        `Trial ${plano} registrado para usuário ${usuarioId}${
          trialEndsAt ? ` (até ${trialEndsAt.toISOString()})` : ""
        }`,
      );
      return;
    }

    if (status === "active") {
      // T343: escrita de billing sob contexto RLS de serviço.
      await comContextoRls(this.prisma, { usuarioId, role: ROLE_SERVICE }, async (tx) => {
        await tx.usuarioPlano.update({
          where: { usuario_id: usuarioId },
          data: {
            plano,
            status: "ATIVA",
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
            trial_ends_at: null,
          },
        });
      });
      this.logger.log(`Trial encerrado — assinatura ${plano} ativa para usuário ${usuarioId}`);
    }
  }

  /**
   * Marca aviso de fim de trial enviado (customer.subscription.trial_will_end).
   */
  private async marcarTrialNotificado(usuarioId: string): Promise<void> {
    // T343: escrita de billing sob contexto RLS de serviço.
    await comContextoRls(this.prisma, { usuarioId, role: ROLE_SERVICE }, async (tx) => {
      await tx.usuarioPlano.update({
        where: { usuario_id: usuarioId },
        data: { trial_notified_at: new Date() },
      });
    });
    this.logger.log(`Fim de trial notificado para usuário ${usuarioId}`);
    // T341: email transacional de aviso de fim de trial (Plus).
    await this.notificarEmail(usuarioId, "trial_will_end", { plano: "Plus" });
  }

  /**
   * T327: marca a primeira ativação de trial (idempotente — só grava quando
   * trial_used_at ainda é null, então reenvios de webhook não sobrescrevem).
   */
  private async marcarTrialUsado(usuarioId: string): Promise<void> {
    // T343: escrita de billing sob contexto RLS de serviço.
    await comContextoRls(this.prisma, { usuarioId, role: ROLE_SERVICE }, async (tx) => {
      await tx.usuarioPlano.updateMany({
        where: { usuario_id: usuarioId, trial_used_at: null },
        data: { trial_used_at: new Date() },
      });
    });
  }

  /**
   * Cancela assinatura (downgrade para FREE).
   */
  private async cancelarAssinatura(usuarioId: string): Promise<void> {
    // T343: escrita de billing sob contexto RLS de serviço.
    await comContextoRls(this.prisma, { usuarioId, role: ROLE_SERVICE }, async (tx) => {
      await tx.usuarioPlano.update({
        where: { usuario_id: usuarioId },
        data: {
          plano: "FREE",
          status: "CANCELADA",
          cancela_em: new Date(),
          trial_ends_at: null,
          trial_notified_at: null,
        },
      });
    });
    this.logger.log(`Assinatura cancelada para usuário ${usuarioId} (downgrade para FREE)`);
    // T341: email transacional de cancelamento.
    await this.notificarEmail(usuarioId, "subscription_cancelled", {});
  }

  /**
   * T341: resolve o email do usuário e dispara o email transacional (no-op
   * quando o mailer não está injetado — mantém testes/instâncias sem mailer
   * funcionando sem quebrar).
   */
  private async notificarEmail(
    usuarioId: string,
    tipo: "trial_will_end" | "subscription_cancelled",
    vars: Record<string, string>,
  ): Promise<void> {
    if (!this.mailer) return;
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { email: true },
    });
    if (!usuario?.email) return;
    await this.mailer.enviar(tipo, usuario.email, vars);
  }

  /**
   * Mapeia tipo de evento Stripe para enum TipoEventoPagamento (Prisma).
   */
  private mapEventType(
    stripeType: string,
  ):
    | "CHECKOUT_SESSION_COMPLETED"
    | "CUSTOMER_SUBSCRIPTION_CREATED"
    | "CUSTOMER_SUBSCRIPTION_UPDATED"
    | "CUSTOMER_SUBSCRIPTION_DELETED"
    | "INVOICE_PAYMENT_SUCCEEDED"
    | "INVOICE_PAYMENT_FAILED"
    | "CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END" {
    const map: Record<
      string,
      | "CHECKOUT_SESSION_COMPLETED"
      | "CUSTOMER_SUBSCRIPTION_CREATED"
      | "CUSTOMER_SUBSCRIPTION_UPDATED"
      | "CUSTOMER_SUBSCRIPTION_DELETED"
      | "INVOICE_PAYMENT_SUCCEEDED"
      | "INVOICE_PAYMENT_FAILED"
      | "CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END"
    > = {
      "checkout.session.completed": "CHECKOUT_SESSION_COMPLETED",
      "customer.subscription.created": "CUSTOMER_SUBSCRIPTION_CREATED",
      "customer.subscription.updated": "CUSTOMER_SUBSCRIPTION_UPDATED",
      "customer.subscription.deleted": "CUSTOMER_SUBSCRIPTION_DELETED",
      "invoice.payment_succeeded": "INVOICE_PAYMENT_SUCCEEDED",
      "invoice.payment_failed": "INVOICE_PAYMENT_FAILED",
      "customer.subscription.trial_will_end": "CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END",
    };
    return map[stripeType] ?? "CHECKOUT_SESSION_COMPLETED";
  }
}
