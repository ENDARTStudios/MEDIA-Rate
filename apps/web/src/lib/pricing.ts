/**
 * pricing.ts — Fonte única de verdade para planos e preços do MEDIA Rate.
 * Usado por /pricing (PricingCards, PricingTable) e /terms (seção 3).
 *
 * D-249 (T247): MOEDA POR LOCALE — o MESMO valor numérico sem conversão
 * (0 / 4,90 / 9,90), com símbolo local: pt-BR 'R$', en-US '$', es-ES '€'.
 * Separador decimal por locale (pt/es '4,90', en '4.90'). A cobrança real
 * (Stripe/backend) permanece decisão de backend — esta tarefa é exibição.
 */

export interface PlanDefinition {
  id: string;
  nameKey: string; // i18n namespace + key (ex: "pricing.freeName")
  price: number; // valor base numérico (sem conversão entre locales)
  currency: Record<string, string>; // locale → símbolo
  highlighted: boolean;
  benefits: string[]; // i18n keys (ex: "pricing.freeFeature1")
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    nameKey: "pricing.freeName",
    price: 0,
    currency: { "pt-BR": "R$", "en-US": "$", "es-ES": "€" },
    highlighted: false,
    benefits: ["pricing.freeFeature1", "pricing.freeFeature2", "pricing.freeFeature3"],
  },
  {
    id: "plus",
    nameKey: "pricing.plusName",
    price: 4.9,
    currency: { "pt-BR": "R$", "en-US": "$", "es-ES": "€" },
    highlighted: true,
    benefits: [
      "pricing.plusFeature1",
      "pricing.plusFeature2",
      "pricing.plusFeature3",
      "pricing.plusFeature4",
    ],
  },
  {
    id: "premium",
    nameKey: "pricing.premiumName",
    price: 9.9,
    currency: { "pt-BR": "R$", "en-US": "$", "es-ES": "€" },
    highlighted: false,
    benefits: [
      "pricing.premiumFeature1",
      "pricing.premiumFeature2",
      "pricing.premiumFeature3",
      "pricing.premiumFeature4",
      "pricing.premiumFeature5",
    ],
  },
];

/** Símbolo da moeda por locale (D-249): R$ / $ / € — mesmo valor numérico. */
export function symbolForLocale(locale: string): string {
  return PLANS.find((p) => p.price > 0)?.currency[locale] ?? "R$";
}

/** Formata um valor com o símbolo do locale e separador decimal local. */
export function formatPlanPrice(price: number, locale: string): string {
  const symbol = symbolForLocale(locale);
  const decimal = locale === "en-US" ? "." : ",";
  const valor = price === 0 ? "0" : price.toFixed(2).replace(".", decimal);
  return `${symbol} ${valor}`;
}
