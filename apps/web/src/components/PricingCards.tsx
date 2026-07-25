"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { useAuthStore } from "@/stores/use-auth-store";

const PLANS = [
  { id: "free", price: 0, highlighted: false },
  { id: "plus", price: 8.90, highlighted: true },
  { id: "premium", price: 14.90, highlighted: false },
] as const;

function formatPrice(price: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", minimumFractionDigits: price === 0 ? 0 : 2 }).format(price);
}

export function PricingCards() {
  const t = useTranslations("pricing");
  const { isAuthenticated } = useAuthStore();
  const locale = typeof document !== "undefined" ? document.documentElement.lang || "pt-BR" : "pt-BR";

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-20 items-start">
      {PLANS.map((plan) => {
        const isPlus = plan.id === "plus";
        const loggedIn = isAuthenticated;

        return (
          <div
            key={plan.id}
            className={`relative rounded-2xl border p-6 flex flex-col ${isPlus ? "bg-surface-elevated border-accent-500/20 shadow-floating scale-[1.02] z-10" : "bg-surface-card border-surface-border/30"}`}
          >
            {isPlus && (
              <>
                <GlowingEffect spread={40} proximity={80} />
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent-600 text-white text-xs font-semibold rounded-full z-10">
                  {t("mostPopular")}
                </span>
              </>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-display font-bold text-gray-100 capitalize">{t(plan.id)}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-gray-100">{formatPrice(plan.price, locale)}</span>
                <span className="text-sm text-gray-400">/{t("month")}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {plan.price === 0 ? t("noCard") : t("cancelAnyTime")}
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1 text-sm">
              {(t.raw(`${plan.id}Features`) as string[]).map((f: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-gray-300">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.price === 0 ? "/register" : `/checkout/${plan.id}`}
              className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${isPlus ? "bg-accent-600 text-white hover:bg-accent-700" : "bg-surface-elevated text-gray-300 hover:bg-surface-border/30"}`}
            >
              {plan.price === 0 ? t("startFree") : loggedIn ? t("upgrade") : t("subscribe")}
            </Link>

            {plan.price > 0 && (
              <p className="text-xs text-gray-600 text-center mt-3">{t("securePayment")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
