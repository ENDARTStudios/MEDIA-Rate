/**
 * Slug canônico do MEDIA Rate — usado pela API (resolução de URLs amigáveis)
 * e espelhado no frontend para navegação.
 *
 * Regras: lowercase, remove diacríticos (NFD), não-alfanuméricos viram hífen,
 * sem hífens nas pontas. Determinístico por título.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Sufixos de tipo aceitos em slugs discriminados (T251): "{slug}-{tipo}". */
export const SUFIXOS_TIPO_SLUG: Record<string, string> = {
  filme: "FILME",
  serie: "SERIE",
  game: "GAME",
  livro: "LIVRO",
  comic: "COMIC",
  manga: "MANGA",
  hq: "COMIC",
};

/**
 * T251: parse de slug DISCRIMINADO "{slug}-{tipo}" (ex.: berserk-manga,
 * duna-livro) para desambiguar colisões de slug entre mídias de tipos
 * diferentes. Retorna o slug limpo e o tipo filtro (ou null se não houver
 * sufixo reconhecido). Função pura — testável.
 */
export function parseSlugDiscriminado(
  slug: string,
): { slug: string; tipo: string | null } {
  const limpo = slugify(slug);
  const ultimoHifen = limpo.lastIndexOf("-");
  if (ultimoHifen > 0) {
    const sufixo = limpo.slice(ultimoHifen + 1);
    const tipo = SUFIXOS_TIPO_SLUG[sufixo];
    if (tipo) {
      return { slug: limpo.slice(0, ultimoHifen), tipo };
    }
  }
  return { slug: limpo, tipo: null };
}
