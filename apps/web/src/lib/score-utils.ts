/**
 * score-utils.ts — normalização de exibição do MEDIA Score™.
 *
 * T262: escala única 0-100 no anel/label. `score100` converte 0-10 → 0-100
 * (valores ≤ 10 são a escala antiga de não-games; games já vêm 0-100).
 */
export function normalizeDisplayScore(score: number, mediaType?: string): number {
  if (mediaType !== "game" && score > 10) {
    return Math.round((score / 10) * 10) / 10;
  }
  return score;
}

/** Converte para 0-100: scores ≤ 10 (escala antiga 0-10) → ×10. */
export function score100(score: number): number {
  if (score <= 10 && score * 10 <= 100) return Math.round(score * 10 * 10) / 10;
  return score;
}
