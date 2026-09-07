import { Injectable, Logger } from "@nestjs/common";
import Stripe from "stripe";
import {
  CheckoutSession,
  CreateCheckoutInput,
  IPaymentGateway,
  WebhookEvent,
} from "../domain/gateway/payment-gateway.port.js";
import { WebhookSignatureError } from "../domain/gateway/payment-gateway.port.js";

/**
 * Adaptador concreto do Stripe para IPaymentGateway (T4.8).
 *
 * - Usa stripe-node SDK.
 * - Lê STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PLUS_ID,
 *   STRIPE_PRICE_PREMIUM_ID do ambiente.
 * - Em test, usar MockPaymentGateway em vez deste.
 */
@Injectable()
export class StripePaymentGateway implements IPaymentGateway {
  private readonly logger = new Logger(StripePaymentGateway.name);
  private readonly client: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY ausente. Defina no .env.");
    }
    this.client = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion,
    });
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
    // T419/T423 (D-389): price por plano+periodo+moeda
    // (STRIPE_PRICE_PLUS_MONTH_BRL ... _YEAR_EUR, conforme setup do Operador).
    // Fallbacks: STRIPE_PRICE_<PLANO>_<MOEDA> (legado) e STRIPE_PRICE_<PLANO>_ID.
    const periodo = (input.periodo ?? "month").toUpperCase();
    const pricePorPeriodoMoeda =
      process.env[`STRIPE_PRICE_${input.plano}_${periodo}_${input.currency}`];
    const pricePorMoeda = process.env[`STRIPE_PRICE_${input.plano}_${input.currency}`];
    const priceLegado =
      input.plano === "PLUS"
        ? (process.env.STRIPE_PRICE_PLUS_ID ?? "")
        : (process.env.STRIPE_PRICE_PREMIUM_ID ?? "");
    // T447: anual NUNCA cai em fallback (mensal/legado) — se o price_ anual
    // não existe, não há sessão anual (o controller responde 422 ainda antes).
    const priceId =
      input.periodo === "year"
        ? pricePorPeriodoMoeda
        : (pricePorPeriodoMoeda ?? pricePorMoeda ?? priceLegado);

    if (!priceId) {
      throw new Error(`STRIPE_PRICE_${input.plano}_${periodo}_${input.currency} não configurado.`);
    }

    // Métodos de pagamento via env (ex.: "card,pix" quando o Pix estiver
    // ativado no dashboard do Stripe). Default: cartão.
    const paymentMethods = (process.env.STRIPE_PAYMENT_METHODS ?? "card")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const session = await this.client.checkout.sessions.create({
      mode: "subscription",
      payment_method_types:
        paymentMethods as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      // Desativa a conversão de moeda automática (adaptive pricing) da conta —
      // ela adiciona seletor de país/moeda ao Checkout e pode falhar com
      // "Erro de processamento" sem registrar tentativa de pagamento.
      adaptive_pricing: { enabled: false },
      customer_email: input.customer_email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: input.success_url,
      cancel_url: input.cancel_url,
      ...(input.trial_period_days
        ? {
            subscription_data: {
              trial_period_days: input.trial_period_days,
              metadata: { usuario_id: input.usuario_id, plano: input.plano },
            },
          }
        : {}),
      metadata: {
        usuario_id: input.usuario_id,
        plano: input.plano,
      },
    });

    return {
      id: session.id,
      url: session.url ?? "",
      subscription_id: session.subscription as string | null,
      customer_id: session.customer as string | null,
    };
  }

  async constructWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET ausente.");
    }
    let event: Stripe.Event;
    try {
      event = this.client.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      // Assinatura inválida → rejeição 400 (não 500) para o Stripe não
      // retentar indefinidamente.
      throw new WebhookSignatureError(`Assinatura de webhook inválida: ${String(err)}`);
    }
    return {
      id: event.id,
      type: event.type,
      data: event.data,
    };
  }

  async cancelSubscription(
    subscription_id: string,
    opts?: { at_period_end?: boolean },
  ): Promise<{ canceled: boolean }> {
    if (opts?.at_period_end) {
      // Cancela no fim do período (mantém acesso até lá) — não cobra mais a
      // seguir; o webhook customer.subscription.deleted faz o downgrade final.
      await this.client.subscriptions.update(subscription_id, { cancel_at_period_end: true });
    } else {
      await this.client.subscriptions.cancel(subscription_id);
    }
    return { canceled: true };
  }
  async setCancelAtPeriodEnd(subscription_id: string): Promise<void> {
    // D-413/T434: cancela a assinatura ao fim do trial sem converter em
    // cobrança automática (o usuário re-assina por novo checkout se quiser).
    await this.client.subscriptions.update(subscription_id, {
      cancel_at_period_end: true,
    });
  }
}
