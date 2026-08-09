import { z } from "zod";

/**
 * T208 — schema de busca do /api/v1/discover.
 *
 * - q: opcional (ausente/vazio = modo catálogo, lista paginada); 1–200 chars.
 * - tipo: enum TipoMidia do banco (FILME/SERIE/GAME/LIVRO/MANGA/COMIC).
 *   D-233/T231: ANIME ficou deprecated (animação japonesa = SERIE,
 *   quadrinho japonês = MANGA) e não é aceito aqui.
 * - genero: slug de gênero (cross-mídia para NARRATIVO; restrito a midia_alvo
 *   para SUBGENERO — regra aplicada no service).
 * - cursor: UUID do último item da página anterior (keyset pagination).
 * - limit: 1–50 (default 20).
 */
export const discoverQuerySchema = z.object({
  q: z.string().trim().max(200, "Termo de busca muito longo.").optional(),
  tipo: z.enum(["FILME", "SERIE", "GAME", "LIVRO", "MANGA", "COMIC"]).optional(),
  genero: z.string().trim().min(1).max(80).optional(),
  cursor: z.string().uuid("Cursor inválido.").optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type DiscoverQueryDto = z.infer<typeof discoverQuerySchema>;
