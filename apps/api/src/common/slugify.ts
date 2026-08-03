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
