/**
 * score-utils.ts — normalização de exibição do MEDIA Score™.
 *
 * T262: escala única 0-100 no anel/label. `score100` converte 0-10 → 0-100
 * (valores ≤ 10 são a escala antiga de não-games; games já vêm 0-100).
 */
export function normalizeDisplayScore(score: number, mediaType?: string): number {
  // T390: arredonda SEMPRE para 1 casa decimal — evita raw float exibido
  // (ex.: 6.422580645161291) no anel/ficha.
  const round1 = (n: number) => Math.round(n * 10) / 10;
  // Escala nativa: games e MANGÁS são 0-100 (não dividir); demais são 0-10.
  // Antes só "game" era excluído — mangá (0-100) caía em "score/10" e era
  // rotulado "/100" (ex.: 82.7 → 8.3/100) no card e na ficha.
  if (mediaType !== "game" && mediaType !== "manga" && score > 10) {
    return round1(score / 10);
  }
  return round1(score);
}

/** Converte para 0-100: scores ≤ 10 (escala antiga 0-10) → ×10. */
export function score100(score: number): number {
  if (score <= 10 && score * 10 <= 100) return Math.round(score * 10 * 10) / 10;
  return score;
}
