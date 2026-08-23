import { z } from "zod";

/**
 * DTO para criar checkout (T4.8).
 */
export const CreateCheckoutDto = z.object({
  plano: z.enum(["PLUS", "PREMIUM"]),
  success_url: z.string().url().max(2048),
  cancel_url: z.string().url().max(2048),
  // T419: moeda derivada no server (nunca do cliente); aceita apenas se o
  // controller optar por repassá-la — default BRL protege LatAm.
  currency: z.enum(["BRL", "USD", "EUR"]).optional(),
});

export type CreateCheckoutDtoType = z.infer<typeof CreateCheckoutDto>;

/**
 * DTO do webhook Stripe (T4.8).
 * Body é raw JSON do Stripe — assinatura vem no header Stripe-Signature.
 */
export interface WebhookPayload {
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string;
      client_reference_id?: string;
      metadata?: { usuario_id?: string; plano?: string };
      subscription?: string;
      current_period_end?: number;
      status?: string;
    };
  };
}
