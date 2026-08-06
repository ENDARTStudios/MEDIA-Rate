import { z } from "zod";

export const upsertInteracaoSchema = z
  .object({
    status: z.enum(["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"]).optional(),
    reacao: z.enum(["GOSTEI", "NAO_GOSTEI"]).nullable().optional(),
    motivoAbandono: z.enum(["NAO_CURTI", "FALTA_TEMPO", "MUDANCA_HUMOR"]).nullable().optional(),
    progressoDetalhe: z.string().max(64).nullable().optional(),
    // T201 (G4) — origem da descoberta cross-mídia (id da aresta do grafo).
    origemRelacaoId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.reacao !== undefined ||
      v.motivoAbandono !== undefined ||
      v.progressoDetalhe !== undefined ||
      v.origemRelacaoId !== undefined,
    {
      message: "Nenhum campo para atualizar.",
    },
  );

export type UpsertInteracaoDto = z.infer<typeof upsertInteracaoSchema>;
