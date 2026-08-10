/**
 * D-262: normaliza URLs de imagem do IGDB — o IGDB devolve t_thumb
 * (miniatura ~90px) e o card deve exibir t_cover_big (capa ~264x374).
 * Aplicado na API (serializers) para corrigir sem re-seed.
 */
export function normalizarImagem(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("images.igdb.com")) {
    return url.replace("t_thumb", "t_cover_big");
  }
  return url;
}
