/**
 * image-policy (T032/D-445) — fonte única de verdade sobre quais fontes de
 * imagem bytem o otimizador (`unoptimized`).
 *
 * Pôsteres desses hosts externos retornavam 402 do otimizador Vercel no
 * limite do plano — servir direto da origem elimina a transformação.
 * Mesma lista da regex que vivia inline no MediaCardShell.
 */
const UNOPTIMIZED_HOSTS = ["anilist", "openlibrary", "myanimelist", "comicvine", "googlebooks"];

export function isUnoptimizedSource(src: string | null | undefined): boolean {
  if (!src) return false;
  const lower = src.toLowerCase();
  return UNOPTIMIZED_HOSTS.some((host) => lower.includes(host));
}
