/**
 * score-utils.ts — normalização de exibição do MEDIA Score™.
 *
 * BETA-GAP-09: escala por tipo de mídia — GAME 0–100; filme/série/livro/
 * quadrinho/MANGÁ 0–10. Sem arredondamento: trunca em 1 casa decimal
 * (7,9 permanece 7,9; 7,95 → 7,9; 6,42… → 6,4).
 *
 * T147 (UG-09/B2-B5): pipeline ÚNICO de exibição — `escalaPorTipo` decide a
 * escala nativa (mangá NUNCA 0-100), `exibirScore` normaliza + trunca +
 * calcula percent e `formatarScoreLocale` formata o número pelo locale
 * (pt-BR vírgula; en-US/es-ES ponto). Todo componente que exibe nota deve
 * passar por aqui; arredondamento na exibição final é proibido.
 */
const ESCALA_100 = new Set(["game"]);

export type ScoreScale = "0-10" | "0-100";

/** Escala NATIVA de exibição por tipo (BETA-GAP-09; T147/B2). */
export function escalaPorTipo(mediaType?: string | null): ScoreScale {
  return ESCALA_100.has(String(mediaType ?? "").toLowerCase()) ? "0-100" : "0-10";
}

/** Valor máximo da escala ("0-10" → 10; "0-100" → 100). */
export function maxDaEscala(escala: ScoreScale): number {
  return escala === "0-100" ? 100 : 10;
}

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

/** Formata um valor JÁ na escala nativa pelo locale (B5): pt-BR "7,9"; en-US "7.9". */
export function formatarScoreLocale(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

export interface ScoreDisplay {
  /** Valor numérico normalizado na escala nativa (truncado em 1 casa). */
  value: number;
  scale: ScoreScale;
  max: number;
  /** Percentual do dial/anel: value/max (NÃO value/10 quando max=100). */
  percent: number;
  /** String formatada pelo locale, pronta para render/aria. */
  formatted: string;
}

/**
 * Pipeline único de exibição: valor cru da API + tipo + locale →
 * escala correta, truncamento sem arredondamento, percent do dial e
 * string formatada. Única fonte da verdade para componentes de score.
 */
export function exibirScore(
  raw: number,
  mediaType: string | null | undefined,
  locale: string,
): ScoreDisplay {
  const scale = escalaPorTipo(mediaType);
  const max = maxDaEscala(scale);
  const value = normalizeDisplayScore(raw, mediaType ?? undefined);
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return { value, scale, max, percent, formatted: formatarScoreLocale(value, locale) };
}
