/**
 * i18n helpers — V1.3 §4
 * ZERO formatação manual de string.
 * Usa apenas Intl APIs nativas do browser.
 */

export function formatNumber(value: number, locale: string, decimals?: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals ?? 1,
    maximumFractionDigits: decimals ?? 1,
  }).format(value);
}

export function formatDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

export function formatYear(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatRelativeTime(dateStr: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return rtf.format(0, "day");
  if (diffDays < 30) return rtf.format(-diffDays, "day");
  const months = Math.round(diffDays / 30);
  if (months < 12) return rtf.format(-months, "month");
  const years = Math.round(diffDays / 365);
  return rtf.format(-years, "year");
}

export function formatScore(score: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(score);
}
