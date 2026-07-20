import { z } from "zod";

/**
 * DTO de exemplo para T1.4 (Zod validation).
 * Roda em /api/v1/echo (POST) — valida body antes do handler.
 */
export const EchoDto = z.object({
  message: z.string().min(1).max(280),
  level: z.enum(["info", "warn", "error"]).default("info"),
});

export type EchoDtoType = z.infer<typeof EchoDto>;
