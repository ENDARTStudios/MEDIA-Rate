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
    const priceId =
      input.plano === "PLUS"
        ? (process.env.STRIPE_PRICE_PLUS_ID ?? "")
        : (process.env.STRIPE_PRICE_PREMIUM_ID ?? "");

    if (!priceId) {
      throw new Error(`STRIPE_PRICE_${input.plano}_ID não configurado.`);
    }

    const session = await this.client.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
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

  async cancelSubscription(subscription_id: string): Promise<{ canceled: boolean }> {
    await this.client.subscriptions.cancel(subscription_id);
    return { canceled: true };
  }
}
