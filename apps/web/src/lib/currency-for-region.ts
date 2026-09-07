/**
 * currency-for-region.ts (T420, D-395) — moeda por PAÍS (geo), idioma só traduz.
 *
 * Refina a D-389: antes a moeda seguia o LOCALE (pt-BR→BRL), criando arbitrage
 * (americano trocando para pt-BR pagaria R$ 4,90 ≈ US$ 0,90) e violando a
 * proteção LatAm (latino em en-US pagaria USD). Agora o PAÍS decide a moeda;
 * valores fixos mantidos (sem conversão).
 */

const LATAM = new Set([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PY",
  "SV",
  "UY",
  "VE",
]);

// Europa (UE/EFTA) — UK (GB) fica FORA: UK → USD.
const PAISES_EUROPA = new Set([
  "ES",
  "PT",
  "FR",
  "DE",
  "IT",
  "NL",
  "BE",
  "LU",
  "IE",
  "AT",
  "FI",
  "SE",
  "DK",
  "NO",
  "IS",
  "CH",
  "GR",
  "PL",
  "CZ",
  "SK",
  "HU",
  "RO",
  "BG",
  "HR",
  "SI",
  "EE",
  "LV",
  "LT",
  "MT",
  "CY",
  "AD",
  "MC",
  "SM",
  "VA",
  "LI",
]);

export type CurrencyCode = "BRL" | "USD" | "EUR";

export function currencyForRegion(locale: string, country?: string | null): CurrencyCode {
  // D-395: country-first.
  if (country) {
    if (LATAM.has(country)) return "BRL";
    if (PAISES_EUROPA.has(country)) return "EUR";
    return "USD"; // US, CA, UK e resto
  }
  // Fallback sem sinal de país: idioma decide (default seguro protege LatAm).
  return locale === "en-US" ? "USD" : "BRL";
}

export function symbolForCurrency(currency: CurrencyCode): string {
  return { BRL: "R$", USD: "$", EUR: "€" }[currency];
}
