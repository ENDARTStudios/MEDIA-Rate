import { z } from "zod";

export const RegistrarConsentDto = z.object({
  categorias: z.object({
    analytics: z.boolean(),
    monitoring: z.boolean(),
    necessary: z.boolean().optional(),
  }),
  versao: z.string().min(1).max(16),
  ts: z.number().int().positive(),
  idioma: z.string().min(2).max(8),
  pais: z.string().min(2).max(8),
  device_hash: z.string().min(16).max(64).optional(),
});
export type RegistrarConsentDtoType = z.infer<typeof RegistrarConsentDto>;
