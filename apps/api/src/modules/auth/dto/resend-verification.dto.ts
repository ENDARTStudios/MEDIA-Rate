import { z } from "zod";

/** T214 — reenvio de verificação de email (rate limit 3/h por email). */
export const resendVerificationSchema = z.object({
  email: z.string().email("Email inválido.").max(254),
  // T376: locale para o link de verificação (default pt-BR no service).
  locale: z.enum(["pt-BR", "en-US", "es-ES"]).optional(),
});

export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
