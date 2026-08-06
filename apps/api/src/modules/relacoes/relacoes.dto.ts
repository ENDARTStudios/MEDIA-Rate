import { z } from "zod";

export const criarRelacaoSchema = z.object({
  origemId: z.string().uuid(),
  destinoId: z.string().uuid(),
  tipo: z.enum([
    "ADAPTACAO_DE",
    "SEQUENCIA_DE",
    "PREQUELA_DE",
    "SPINOFF_DE",
    "MESMO_UNIVERSO",
    "MESMA_HISTORIA_REAL",
  ]),
  notaEditorial: z.string().max(160).nullable().optional(),
});

export type CriarRelacaoDto = z.infer<typeof criarRelacaoSchema>;
