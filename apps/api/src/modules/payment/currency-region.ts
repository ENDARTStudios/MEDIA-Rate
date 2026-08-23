/**
 * currency-region.ts (T420, D-395) — moeda por PAÍS (geo) no lado do SERVER.
 * Nunca aceita moeda do cliente. Refina a D-389 (country-first).
 */
const LATAM = new Set([
  "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC", "GT",
  "HN", "MX", "NI", "PA", "PE", "PY", "SV", "UY", "VE",
]);

// Europa (UE/EFTA) — UK (GB) fica FORA: UK → USD.
const PAISES_EUROPA = new Set([
  "ES", "PT", "FR", "DE", "IT", "NL", "BE", "LU", "IE", "AT", "FI", "SE", "DK", "NO",
  "IS", "CH", "GR", "PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "EE", "LV", "LT",
  "MT", "CY", "AD", "MC", "SM", "VA", "LI",
]);

export type CurrencyCode = "BRL" | "USD" | "EUR";

export function currencyForRegion(locale: string, country?: string | null): CurrencyCode {
  if (country) {
    if (LATAM.has(country)) return "BRL";
    if (PAISES_EUROPA.has(country)) return "EUR";
    return "USD";
  }
  return locale === "en-US" ? "USD" : "BRL";
}
