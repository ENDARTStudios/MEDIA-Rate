/**
 * Porta (interface) do gateway de pagamento (T4.8 — Hexagonal Architecture).
 *
 * O domínio depende apenas desta interface, nunca do SDK Stripe direto.
 * Adaptadores concretos (StripePaymentGateway, MockPaymentGateway) implementam
 * a porta. Permite trocar provedor sem reescrever domínio.
 */

/**
 * Sessão de checkout criada pelo gateway.
 */
export interface CheckoutSession {
  id: string;
  url: string;
  /** ID da assinatura criada (null se ainda não criada). */
  subscription_id: string | null;
  /** ID do cliente no gateway (ex: Stripe customer ID). */
  customer_id: string | null;
}

/**
 * Dados para criar sessão de checkout.
 */
export interface CreateCheckoutInput {
  plano: "PLUS" | "PREMIUM";
  customer_email: string;
  /** URL de sucesso após checkout. */
  success_url: string;
  /** URL de cancelamento. */
  cancel_url: string;
  /** ID do usuário no MEDIA Rate (metadata). */
  usuario_id: string;
  /** Dias de trial sem cobrança (undefined = sem trial). */
  trial_period_days?: number;
}

/**
 * Evento de webhook recebido do gateway.
 */
export interface WebhookEvent {
  id: string; // ID do evento no gateway (ex: evt_...)
  type: string; // ex: checkout.session.completed
  data: unknown; // payload bruto
}

/**
 * Erro de assinatura inválida de webhook (tentativa de fraude ou
 * configuração errada). O serviço traduz para HTTP 400 — o gateway de
 * pagamento rejeita a request sem retentativas indevidas.
 */
export class WebhookSignatureError extends Error {}

/**
 * Porta do gateway de pagamento.
 */
export interface IPaymentGateway {
  /**
   * Cria sessão de checkout para um plano.
   * @throws Error se falhar (ex: price_id inválido, gateway indisponível).
   */
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession>;

  /**
   * Constrói evento de webhook a partir do payload bruto + assinatura.
   * @throws WebhookSignatureError se a assinatura for inválida.
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookEvent>;

  /**
   * Cancela assinatura ativa.
   */
  cancelSubscription(subscription_id: string): Promise<{ canceled: boolean }>;
}

/**
 * Token de injeção para o IPaymentGateway (NestJS DI).
 */
export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");
