/**
 * T211/D-621 — núcleo compartilhado dos dials de score.
 *
 * **Por que existem DOIS componentes e um núcleo** (e não um componente só):
 * o `ScoreDial` é client (contador animado) e o `StaticScoreDial` é JSX/SVG puro renderizado
 * no servidor, justamente para que os ~60 cards dos carrosséis **não hidratem JS de
 * animação** (D-380/T405 — era o gargalo de TTI/LCP da home). Fundir os dois num arquivo
 * `"use client"` faria o estático virar client e **destruiria** esse ganho.
 *
 * O que dava para unificar — e dava prejuízo — era a **duplicação**: os dois tinham cópias
 * próprias de `SIZE_CONFIG` e da matemática do anel, e já haviam divergido uma vez na função
 * de faixa (D-582.4a: 3 faixas num lado, 6 no outro, mesma nota com cor diferente no card e
 * no módulo de score). Aqui fica a **única fonte** de tamanho, geometria e cor; os dois
 * componentes continuam com o markup que já renderizavam, caractere por caractere.
 *
 * Sem `"use client"` de propósito: precisa ser importável pelo servidor.
 */
import { colors, scoreColor } from "@/lib/design-tokens";

export type ScoreDialSize = "sm" | "md" | "lg";
export type ScoreDialScale = "0-10" | "0-100";
export type ScoreBandLabel = "high" | "medium" | "low";

/** Tamanhos do dial — idênticos nos dois componentes desde sempre. */
export const SCORE_DIAL_SIZE = {
  sm: { ring: "h-10 w-10", number: "text-sm", stroke: 3, radius: 14 },
  md: { ring: "h-16 w-16", number: "text-xl", stroke: 4, radius: 24 },
  lg: { ring: "h-24 w-24", number: "text-3xl", stroke: 6, radius: 38 },
} as const;

/** Trilha do anel (antes repetida como literal nos dois arquivos). */
export const SCORE_DIAL_TRACK = "rgba(148,163,255,0.12)";

/**
 * D-582.4a (T211): faixa **relativa** do score, com a cor vinda de `scoreColor()` (6 faixas
 * em `design-tokens.ts`). O rótulo de 3 níveis é o que a UI usa para texto curto.
 */
export function scoreBand(
  value: number,
  scale: ScoreDialScale,
): { color: string; label: ScoreBandLabel } {
  const n = scale === "0-100" ? value / 10 : value;
  const label: ScoreBandLabel = n >= 8 ? "high" : n >= 6 ? "medium" : "low";
  return { color: scoreColor(value, scale), label };
}

/** Geometria do anel: valor limitado à escala, circunferência, deslocamento e cor da faixa. */
export function dialGeometry(value: number, scale: ScoreDialScale, size: ScoreDialSize) {
  const cfg = SCORE_DIAL_SIZE[size];
  const max = scale === "0-100" ? 100 : 10;
  const clamped = Math.max(0, Math.min(max, value));
  const circ = 2 * Math.PI * cfg.radius;
  const offset = circ - (clamped / max) * circ;
  return { cfg, max, clamped, circ, offset, color: scoreColor(clamped, scale) };
}

/**
 * D-646: chave da faixa (as MESMAS de \`scoredial.bands\` e de \`colors.score\`), derivada da cor
 * canônica em vez de repetir os limiares de \`scoreColor()\`. Se as faixas mudarem no token, isto
 * continua correto sozinho — e é uma fonte só para o selo do hero e para o ciclo da régua.
 */
export type ScoreBandKey = "9" | "8" | "7" | "6" | "5" | "low";

export function bandKey(value: number, scale: ScoreDialScale = "0-10"): ScoreBandKey {
  const cor = scoreColor(value, scale);
  if (cor === colors.score[9]) return "9";
  if (cor === colors.score[8]) return "8";
  if (cor === colors.score[7]) return "7";
  if (cor === colors.score[6]) return "6";
  if (cor === colors.score[5]) return "5";
  return "low";
}
