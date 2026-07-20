import { z } from "zod";

/**
 * DTO para solicitar exclusão de dados (T4.9 LGPD).
 */
export const SolicitarExclusaoDto = z.object({
  motivo: z.string().max(500).optional(),
});

export type SolicitarExclusaoDtoType = z.infer<typeof SolicitarExclusaoDto>;
