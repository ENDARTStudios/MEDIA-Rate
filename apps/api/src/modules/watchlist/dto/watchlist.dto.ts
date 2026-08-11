import { z } from "zod";

export const addToWatchlistSchema = z.object({
  midia_id: z.string().min(1).max(255),
  coluna: z.enum(["WANT", "WATCHING", "COMPLETED", "DROPPED"]).default("WANT"),
});

export const moveWatchlistSchema = z.object({
  coluna: z.enum(["WANT", "WATCHING", "COMPLETED", "DROPPED"]),
});

/**
 * T285 (Addendum 4): sinal de reação pós-conclusão. Todos os campos são
 * opcionais e pelo menos um deve ser informado; fechar sem reagir é válido
 * (a UI não envia este PATCH). MotivoAbandono segue o vocabulário do domínio
 * de interação (NAO_CURTI/FALTA_TEMPO/MUDANCA_HUMOR) — nunca duplica enum.
 */
export const registrarReacaoSchema = z
  .object({
    reacao: z.enum(["GOSTEI", "NAO_GOSTEI"]).optional(),
    motivo_abandono: z.enum(["NAO_CURTI", "FALTA_TEMPO", "MUDANCA_HUMOR"]).optional(),
    progresso_detalhe: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.reacao !== undefined || d.motivo_abandono !== undefined, {
    message: "Informe pelo menos reacao ou motivo_abandono.",
  });

export type AddToWatchlistDto = z.infer<typeof addToWatchlistSchema>;
export type MoveWatchlistDto = z.infer<typeof moveWatchlistSchema>;
export type RegistrarReacaoDto = z.infer<typeof registrarReacaoSchema>;
