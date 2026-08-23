/**
 * currency-region.ts (T419, D-389) — moeda por locale+região no lado do SERVER
 * (nunca aceita moeda do cliente). Mesma regra do display (T418).
 */
const PAISES_EUROPA = new Set([
  "ES", "PT", "FR", "DE", "IT", "NL", "BE", "LU", "IE", "AT", "FI", "SE", "DK", "NO",
  "IS", "CH", "GR", "PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "EE", "LV", "LT",
  "MT", "CY", "GB", "AD", "MC", "SM", "VA", "LI",
]);

export type CurrencyCode = "BRL" | "USD" | "EUR";

export function currencyForRegion(locale: string, country?: string | null): CurrencyCode {
  if (locale === "en-US") return "USD";
  if (locale === "es-ES") {
    return country && PAISES_EUROPA.has(country) ? "EUR" : "BRL";
  }
  return "BRL";
}
