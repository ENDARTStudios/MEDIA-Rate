import { slugify } from "../../common/slugify.js";
import type { Prisma, TipoMidia } from "@prisma/client";

/**
 * T398-restante: slug único por título+tipo. A mídia mais antiga mantém o
 * slug base; colisões (mesmo título em tipos diferentes) recebem sufixo
 * "-{tipo}" — consistente com parseSlugDiscriminado (SUFIXOS_TIPO_SLUG).
 * Checa o banco a cada candidato e incrementa "-{tipo}-2" se ainda colidir.
 * Idempotente e owner-safe: nunca reusa um slug de outra mídia ativa.
 */
const SUFIXO_TIPO: Record<string, string> = {
  FILME: "filme",
  SERIE: "serie",
  GAME: "game",
  LIVRO: "livro",
  COMIC: "comic",
  MANGA: "manga",
  ANIME: "serie",
};

export async function slugUnico(
  client: Prisma.TransactionClient,
  titulo: string,
  tipo: TipoMidia,
  excluirId?: string,
): Promise<string> {
  const base = slugify(titulo) || "midia";
  const sufixo = SUFIXO_TIPO[tipo] ?? "outro";

  let candidato = base;
  let tentativa = 0;
  for (;;) {
    const existente = await client.midia.findFirst({
      where: {
        slug: candidato,
        deleted_at: null,
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
      select: { id: true },
    });
    if (!existente) return candidato;
    tentativa += 1;
    candidato = tentativa === 1 ? `${base}-${sufixo}` : `${base}-${sufixo}-${tentativa}`;
  }
}
