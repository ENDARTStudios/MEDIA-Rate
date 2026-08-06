import { z } from "zod";

/** Categorias em roadmap que aceitam lead capture. */
export const WAITLIST_CATEGORIES = ["book", "comic", "anime"] as const;

export const waitlistNotifySchema = z
  .object({
    email: z.string().trim().email("Email inválido").max(254),
    category: z.enum(WAITLIST_CATEGORIES),
  })
  .strict(); // rejeita campos extras

export type WaitlistNotifyDto = z.infer<typeof waitlistNotifySchema>;
