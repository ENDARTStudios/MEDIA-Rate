import { normalizarUrlImagem } from "./image-url-guard.js";

/**
 * D-262: normaliza URLs de imagem do IGDB — o IGDB devolve t_thumb
 * (miniatura ~90px) e o card deve exibir t_cover_big (capa ~264x374).
 * Aplicado na API (serializers) para corrigir sem re-seed.
 *
 * T196-C (CodeQL #88): a decisão de transformar **não** usa mais substring de
 * URL — ver `image-url-guard.ts` (https + hostname exato da allowlist + troca
 * só no pathname). Contrato preservado: falsy → null; qualquer outra URL volta
 * intacta; não lança.
 */
export function normalizarImagem(url: string | null | undefined): string | null {
  if (!url) return null;
  return normalizarUrlImagem(url);
}
