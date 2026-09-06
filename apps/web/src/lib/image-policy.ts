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

/**
 * T031 — imagens locais (uploads próprios, `/uploads/media/...`).
 * Servidas estáticas pelo backend com ladder fixa (ver `nomeVariante` em
 * apps/api/src/modules/upload/variants.ts) — zero transformação runtime.
 */
export function isLocalSource(src: string | null | undefined): boolean {
  return !!src && src.startsWith("/") && !src.startsWith("//");
}

const LOCAL_WIDTHS = [320, 640, 960] as const;

/** `/uploads/media/<id>/<uuid>.jpg` → srcset das 3 variantes WebP. */
export function localSrcSet(src: string): string {
  const base = src.replace(/\.[a-z0-9]+$/i, "");
  return LOCAL_WIDTHS.map((w) => `${base}-w${w}.webp ${w}w`).join(", ");
}
