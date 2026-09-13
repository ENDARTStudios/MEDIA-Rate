import { timingSafeEqual } from "node:crypto";

/**
 * T447/D-441 — validação do token do gatilho on-demand do ISR
 * (POST /api/revalidate). Pura para ser testável sem runtime Next.
 *
 * - Secret vazio = sempre inválido (fail-closed: sem REVALIDATE_SECRET
 *   configurado, ninguém revalida).
 * - Comparação timing-safe com guarda de tamanho (timingSafeEqual exige
 *   buffers de mesmo tamanho — sem o guarda, tamanhos diferentes lançam).
 */
export function isRevalidateTokenValid(supplied: string | null, expected: string): boolean {
  if (!supplied || expected.length === 0) return false;
  const a = Buffer.from(supplied, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.byteLength !== b.byteLength) return false;
  return timingSafeEqual(a, b);
}
