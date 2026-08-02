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

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
  ) {}

  /**
   * Cria sessão de checkout para upgrade de plano.
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
      const webhookPayload = event.data as WebhookPayload;
      const usuarioId = webhookPayload?.data?.object?.metadata?.usuario_id;

      switch (event.type) {
        case "checkout.session.completed":
          if (usuarioId) {
            await this.ativarAssinatura(webhookPayload, usuarioId);
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

    await this.prisma.usuarioPlano.upsert({
      where: { usuario_id: usuarioId },
      create: {
        usuario_id: usuarioId,
        plano,
        status: "ATIVA",
        stripe_subscription_id: subscriptionId ?? null,
        stripe_customer_id: customerId ?? null,
        current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      },
      update: {
        plano,
        status: "ATIVA",
        stripe_subscription_id: subscriptionId ?? undefined,
        stripe_customer_id: customerId ?? undefined,
        current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
      },
    });

    this.logger.log(`Assinatura ${plano} ativada para usuário ${usuarioId}`);
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
