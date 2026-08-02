"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/navigation";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { useAuthStore } from "@/stores/use-auth-store";

const PLANS = [
  { id: "free", price: 0, highlighted: false },
  { id: "plus", price: 4.9, highlighted: true },
  { id: "premium", price: 9.9, highlighted: false },
] as const;

function formatPrice(price: number, locale: string) {
  const currency = locale === "pt-BR" ? "BRL" : locale === "en-US" ? "USD" : "EUR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: price === 0 ? 0 : 2,
  }).format(price);
}

export function PricingCards() {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-20 items-stretch">
      {PLANS.map((plan) => {
        const isPlus = plan.id === "plus";
        const loggedIn = isAuthenticated;

        return (
          <div
            key={plan.id}
            className={`relative rounded-md border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
              isPlus
                ? "bg-[#11111E] border-[rgba(129,140,248,0.2)]"
                : "bg-[#11111E] border-[rgba(129,140,248,0.08)] hover:border-[rgba(129,140,248,0.3)]"
            }`}
          >
            {isPlus && (
              <>
                <GlowingEffect spread={40} proximity={64} borderWidth={3} glow />
                <div
                  className="absolute inset-0 rounded-md overflow-hidden pointer-events-none"
                  aria-hidden="true"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[1px]"
                    style={{
                      background: "linear-gradient(90deg, transparent, #818CF8 50%, transparent)",
                      animation: "beam-h 3s ease-in-out infinite",
                    }}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[1px]"
                    style={{
                      background: "linear-gradient(90deg, transparent, #818CF8 50%, transparent)",
                      animation: "beam-h 3s ease-in-out infinite 1.5s",
                    }}
                  />
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[1px]"
                    style={{
                      background: "linear-gradient(180deg, transparent, #818CF8 50%, transparent)",
                      animation: "beam-v 3s ease-in-out infinite 0.5s",
                    }}
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-[1px]"
                    style={{
                      background: "linear-gradient(180deg, transparent, #818CF8 50%, transparent)",
                      animation: "beam-v 3s ease-in-out infinite 2s",
                    }}
                  />
                </div>
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#818CF8] text-[#0F172A] text-xs font-semibold rounded-full z-10">
                  {t("mostPopular")}
                </span>
              </>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-heading font-bold text-[#EDE7DC] capitalize">
                {t(plan.id)}
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-heading font-bold text-[#EDE7DC]">
                  {formatPrice(plan.price, locale)}
                </span>
                <span className="text-sm text-[#9CA3AF]">/{t("month")}</span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {plan.price > 0
                  ? formatPrice(plan.price * 12 * 0.85, locale) +
                    "/" +
                    t("year") +
                    " (" +
                    t("savePercent", { pct: 15 }) +
                    ")"
                  : null}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {plan.price === 0 ? t("noCard") : t("cancelAnyTime")}
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1 text-sm">
              {(t.raw(`${plan.id}Features`) as string[]).map((f: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 mt-0.5 shrink-0 text-[#818CF8]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-[#9CA3AF]">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.price === 0 ? "/register" : `/checkout/${plan.id}`}
              className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${isPlus ? "bg-[#818CF8] text-[#0F172A] hover:bg-gradient-to-r hover:from-[#818CF8] hover:to-[#38BDF8]" : "bg-[#1C1C2E] text-[#EDE7DC] hover:bg-gradient-to-r hover:from-[#818CF8] hover:to-[#38BDF8] hover:text-[#0F172A]"}`}
            >
              {plan.price === 0 ? t("startFree") : loggedIn ? t("upgrade") : t("subscribe")}
            </Link>

            {plan.price > 0 && (
              <p className="text-xs text-[#9CA3AF] text-center mt-3">{t("securePayment")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
