import { z } from "zod";

/**
 * T209 — query de recomendações (PLUS gênero+score / PREMIUM colaborativo).
 */
export const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().uuid("Cursor inválido.").optional(),
});

export type RecommendationsQueryDto = z.infer<typeof recommendationsQuerySchema>;
