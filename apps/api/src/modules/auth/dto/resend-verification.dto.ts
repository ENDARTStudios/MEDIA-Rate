import { z } from "zod";

/** T214 — reenvio de verificação de email (rate limit 3/h por email). */
export const resendVerificationSchema = z.object({
  email: z.string().email("Email inválido.").max(254),
});

export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
