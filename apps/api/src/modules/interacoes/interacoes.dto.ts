import { z } from "zod";

export const upsertInteracaoSchema = z
  .object({
    status: z.enum(["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"]).optional(),
    reacao: z.enum(["GOSTEI", "NAO_GOSTEI"]).nullable().optional(),
    motivoAbandono: z.enum(["NAO_CURTI", "FALTA_TEMPO", "MUDANCA_HUMOR"]).nullable().optional(),
    progressoDetalhe: z.string().max(64).nullable().optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.reacao !== undefined ||
      v.motivoAbandono !== undefined ||
      v.progressoDetalhe !== undefined,
    {
      message: "Nenhum campo para atualizar.",
    },
  );

export type UpsertInteracaoDto = z.infer<typeof upsertInteracaoSchema>;
