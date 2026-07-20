import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  CheckoutSession,
  CreateCheckoutInput,
  IPaymentGateway,
  WebhookEvent,
} from "../domain/gateway/payment-gateway.port.js";

/**
 * Mock do IPaymentGateway para testes (T4.8).
 *
 * - Não faz chamadas reais ao Stripe.
 * - Gera URLs mockadas (data URLs) para checkout.
 * - constructWebhookEvent aceita qualquer payload (sem verificação de assinatura).
 * - Mantém estado em memória para inspeção nos testes.
 */
@Injectable()
export class MockPaymentGateway implements IPaymentGateway {
  private readonly logger = new Logger(MockPaymentGateway.name);
  public readonly createdSessions: CheckoutSession[] = [];
  public readonly cancelledSubscriptions: string[] = [];

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const session: CheckoutSession = {
      id: `cs_test_${randomUUID()}`,
      url: `data:text/html,<html><body>Mock checkout for ${input.plano}</body></html>`,
      subscription_id: `sub_test_${randomUUID()}`,
      customer_id: `cus_test_${randomUUID()}`,
    };
    this.createdSessions.push(session);
    this.logger.log(`Mock checkout criado: ${session.id} para plano ${input.plano}`);
    return session;
  }

  async constructWebhookEvent(payload: string | Buffer, _signature: string): Promise<WebhookEvent> {
    // Em mock, aceita qualquer payload. Se for JSON, parseia o type.
    let type = "checkout.session.completed";
    let data: unknown = payload;
    try {
      const parsed = JSON.parse(typeof payload === "string" ? payload : payload.toString());
      type = parsed.type ?? type;
      data = parsed;
    } catch {
      // mantém defaults
    }
    return {
      id: `evt_test_${randomUUID()}`,
      type,
      data,
    };
  }

  async cancelSubscription(subscription_id: string): Promise<{ canceled: boolean }> {
    this.cancelledSubscriptions.push(subscription_id);
    return { canceled: true };
  }
}
