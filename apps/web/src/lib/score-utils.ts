/**
 * score-utils.ts — normalização de exibição do MEDIA Score™.
 *
 * BETA-GAP-09: escala por tipo de mídia — GAME 0–100; filme/série/livro/
 * quadrinho/MANGÁ 0–10. Sem arredondamento: trunca em 1 casa decimal
 * (7,9 permanece 7,9; 7,95 → 7,9; 6,42… → 6,4).
 */
const ESCALA_100 = new Set(["game"]);

/** Trunca para 1 casa decimal (NÃO arredonda). Epsilon evita erro de float. */
export function truncar1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n * 10 + 1e-9) / 10;
}

export function normalizeDisplayScore(score: number, mediaType?: string): number {
  if (!Number.isFinite(score)) return 0;
  const tipo = String(mediaType ?? "").toLowerCase();
  if (ESCALA_100.has(tipo)) return truncar1(score);
  // Não-game (inclui manga): valores > 10 estão em 0–100 → normaliza p/ 0–10.
  return truncar1(score > 10 ? score / 10 : score);
}

/** Converte para 0-100: scores ≤ 10 (escala 0-10) → ×10. */
export function score100(score: number): number {
  if (score <= 10 && score * 10 <= 100) return truncar1(score * 10);
  return truncar1(score);
}
