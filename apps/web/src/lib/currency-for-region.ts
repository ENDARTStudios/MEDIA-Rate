/**
 * currency-for-region.ts (T418, D-389) — moeda por locale+região, SEM conversão.
 *
 * Regra exata do Operador (D-389):
 *   pt-BR → BRL (R$); en-US → USD ($);
 *   es-ES (Europa) → EUR (€); es-ES (América Latina) → BRL (R$).
 * Fallback: es-ES sem sinal de Europa → BRL (default protege a LatAm — nunca
 * paga em USD/EUR por engano).
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
  return "BRL"; // pt-BR (e default)
}

export function symbolForCurrency(currency: CurrencyCode): string {
  return { BRL: "R$", USD: "$", EUR: "€" }[currency];
}
