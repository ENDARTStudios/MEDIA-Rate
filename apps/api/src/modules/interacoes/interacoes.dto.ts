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

/**
 * D-525 — query do GET /api/v1/interacoes (fonte da biblioteca).
 *
 * - status/tipo: enums do banco; ausentes = sem filtro.
 * - limit: 1-50 (default 50) — teto explícito de página.
 * - cursor: token opaco (offset em base64url) emitido pela resposta anterior;
 *   inválido → 400 no service.
 */
export const listInteracoesQuerySchema = z.object({
  status: z.enum(["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"]).optional(),
  tipo: z.enum(["FILME", "SERIE", "GAME", "LIVRO", "MANGA", "COMIC"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().max(64).optional(),
});

export type ListInteracoesQueryDto = z.infer<typeof listInteracoesQuerySchema>;
