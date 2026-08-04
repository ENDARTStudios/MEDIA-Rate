import { Inject, Injectable, Logger, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import { createHash } from "node:crypto";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
  type CheckoutSession,
} from "./domain/gateway/payment-gateway.port.js";
import { WebhookSignatureError } from "./domain/gateway/payment-gateway.port.js";
import { CreateCheckoutDtoType, WebhookPayload } from "./dto/payment.dto.js";

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
  ) {}

  /**
   * Cria sessão de checkout para upgrade de plano.
   * Plano PLUS inicia com trial de 7 dias (D-132).
   */
  async createCheckout(
    dto: CreateCheckoutDtoType,
    usuario: { id: string; email: string },
  ): Promise<CheckoutSession> {
    const session = await this.gateway.createCheckoutSession({
      plano: dto.plano,
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
    const evento = await this.prisma.eventoPagamento.create({
      data: {
        stripe_event_id: event.id,
        tipo: this.mapEventType(event.type),
        payload_hash,
        payload_raw: event.data as object,
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

    await this.prisma.usuarioPlano.upsert({
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
      await this.prisma.usuarioPlano.upsert({
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
      this.logger.log(
        `Trial ${plano} registrado para usuário ${usuarioId}${
          trialEndsAt ? ` (até ${trialEndsAt.toISOString()})` : ""
        }`,
      );
      return;
    }

    if (status === "active") {
      await this.prisma.usuarioPlano.update({
        where: { usuario_id: usuarioId },
        data: {
          plano,
          status: "ATIVA",
          current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
          trial_ends_at: null,
        },
      });
      this.logger.log(`Trial encerrado — assinatura ${plano} ativa para usuário ${usuarioId}`);
    }
  }

  /**
   * Marca aviso de fim de trial enviado (customer.subscription.trial_will_end).
   */
  private async marcarTrialNotificado(usuarioId: string): Promise<void> {
    await this.prisma.usuarioPlano.update({
      where: { usuario_id: usuarioId },
      data: { trial_notified_at: new Date() },
    });
    this.logger.log(`Fim de trial notificado para usuário ${usuarioId}`);
  }

  /**
   * Cancela assinatura (downgrade para FREE).
   */
  private async cancelarAssinatura(usuarioId: string): Promise<void> {
    await this.prisma.usuarioPlano.update({
      where: { usuario_id: usuarioId },
      data: {
        plano: "FREE",
        status: "CANCELADA",
        cancela_em: new Date(),
        trial_ends_at: null,
        trial_notified_at: null,
      },
    });
    this.logger.log(`Assinatura cancelada para usuário ${usuarioId} (downgrade para FREE)`);
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
