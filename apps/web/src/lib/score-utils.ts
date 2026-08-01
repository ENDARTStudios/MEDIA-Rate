export function normalizeDisplayScore(score: number, mediaType?: string): number {
  if (mediaType === "game" && score > 10) {
    return Math.round((score / 10) * 10) / 10;
  }
  return score;
}
