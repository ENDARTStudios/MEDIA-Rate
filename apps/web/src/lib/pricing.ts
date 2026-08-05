/**
 * pricing.ts — Fonte única de verdade para planos e preços do MEDIA Rate.
 * Usado por /pricing (PricingCards, PricingTable) e /terms (seção 3).
 *
 * Moeda: o Stripe cobra em BRL (R$ 4,90 / R$ 9,90) — por isso TODOS os
 * locales exibem BRL, evitando a inconsistência legal/UX de mostrar EUR/USD
 * e cobrar em reais (D-178).
 */

export interface PlanDefinition {
  id: string;
  nameKey: string; // i18n namespace + key (ex: "pricing.freeName")
  price: number; // valor base na moeda local (BRL)
  currency: Record<string, string>; // locale → currency code
  highlighted: boolean;
  benefits: string[]; // i18n keys (ex: "pricing.freeFeature1")
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    nameKey: "pricing.freeName",
    price: 0,
    currency: { "pt-BR": "BRL", "en-US": "BRL", "es-ES": "BRL" },
    highlighted: false,
    benefits: ["pricing.freeFeature1", "pricing.freeFeature2", "pricing.freeFeature3"],
  },
  {
    id: "plus",
    nameKey: "pricing.plusName",
    price: 4.9,
    currency: { "pt-BR": "BRL", "en-US": "BRL", "es-ES": "BRL" },
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
    currency: { "pt-BR": "BRL", "en-US": "BRL", "es-ES": "BRL" },
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

export function formatPlanPrice(price: number, locale: string): string {
  const currency = PLANS.find((p) => p.price === price)?.currency[locale] ?? "BRL";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: price === 0 ? 0 : 2,
  }).format(price);
}
