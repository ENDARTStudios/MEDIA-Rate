"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { useAuthStore } from "@/stores/use-auth-store";
import { formatPlanPrice, PLANS } from "@/lib/pricing";

type Billing = "monthly" | "annual";

const ANNUAL_DISCOUNT = 0.85;

export function PricingCards({
  currencySymbol,
  annualAvailable = true,
}: {
  currencySymbol?: string;
  annualAvailable?: boolean;
}) {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const { isAuthenticated } = useAuthStore();
  const shouldReduce = useReducedMotion();
  const [billing, setBilling] = useState<Billing>("monthly");
  // T447: se o plano anual não está configurado (env STRIPE_PRICE_*_YEAR_* ausente),
  // força mensal — nunca vendemos anual sem price_ válido no Stripe.
  const safeBilling: Billing = annualAvailable ? billing : "monthly";

  const effectivePrice = useMemo(
    () => (plan: number) =>
      safeBilling === "annual" && plan > 0
        ? Math.round(plan * 12 * ANNUAL_DISCOUNT * 100) / 100
        : plan,
    [safeBilling],
  );

  return (
    <div>
      {/* Toggle mensal/anual com economia destacada (Parte 3.7) */}
      <div
        className="mb-10 flex items-center justify-center gap-3"
        role="group"
        aria-label={t("billingPeriod")}
      >
        {(["monthly", "annual"] as Billing[]).map((b) => {
          const unavailable = b === "annual" && !annualAvailable;
          return (
            <button
              key={b}
              type="button"
              onClick={() => {
                if (!unavailable) setBilling(b);
              }}
              aria-pressed={billing === b}
              disabled={unavailable}
              className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo ${
                unavailable
                  ? "cursor-not-allowed opacity-50"
                  : billing === b
                    ? "bg-accent-indigo text-accent-indigo-foreground"
                    : "bg-surface-elevated text-fg-secondary hover:text-fg-primary"
              }`}
            >
              {b === "annual" ? t("year") : t("month")}
              {b === "annual" && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    unavailable
                      ? "bg-black/20"
                      : billing === b
                        ? "bg-black/20"
                        : "bg-accent-emerald/15 text-accent-emerald"
                  }`}
                >
                  {unavailable ? t("comingSoonShort") : "-15%"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-20 items-stretch">
        {PLANS.map((plan) => {
          const isPlus = plan.id === "plus";
          const loggedIn = isAuthenticated;
          const price = effectivePrice(plan.price);
          const annualTotal = plan.price > 0 ? plan.price * 12 * ANNUAL_DISCOUNT : 0;

          return (
            <div
              key={plan.id}
              data-testid={`plan-card-${plan.id}`}
              className={`relative rounded-md border p-6 flex flex-col transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 ${
                isPlus
                  ? "bg-surface-card border-[rgba(129,140,248,0.2)]"
                  : "bg-surface-card border-surface-border hover:border-[rgba(129,140,248,0.3)]"
              }`}
            >
              {isPlus && (
                <>
                  <GlowingEffect spread={40} proximity={64} borderWidth={3} glow />
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent-indigo text-accent-indigo-foreground text-xs font-semibold rounded-full z-10">
                    {t("mostPopular")}
                  </span>
                </>
              )}

              <div className="mb-4">
                {/* T210: era <h3> e a página (/pricing) só tem <h1> → pulava o
                    nível 2 (achado `skipped-heading` do detector de DOM).
                    O componente é usado APENAS nesta página. */}
                <h2 className="text-lg font-heading font-bold text-fg-primary capitalize">
                  {t(plan.id)}
                </h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${plan.id}-${safeBilling}`}
                      initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduce ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="text-4xl font-heading font-bold text-fg-primary tabular-nums"
                    >
                      {safeBilling === "annual" && plan.price > 0
                        ? formatPlanPrice(annualTotal, locale, currencySymbol)
                        : formatPlanPrice(price, locale, currencySymbol)}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-sm text-fg-secondary">
                    /{safeBilling === "annual" ? t("year") : t("month")}
                  </span>
                </div>
                <p className="text-xs text-fg-muted mt-0.5">
                  {plan.price === 0
                    ? t("noCard")
                    : safeBilling === "annual"
                      ? t("savePercent", { pct: 15 })
                      : `${formatPlanPrice(plan.price * 12 * ANNUAL_DISCOUNT, locale, currencySymbol)}/${t("year")} (${t("savePercent", { pct: 15 })})`}
                </p>
              </div>

              {/* D-560b: a seção de mídias desbloqueadas foi removida —
                  todos os planos incluem os 6 tipos de mídia, então as bolinhas
                  eram idênticas em Free/Plus/Premium (audit Operador 2026-10-03). */}

              <ul role="list" className="space-y-3 mb-8 flex-1 text-sm">
                {(t.raw(`${plan.id}Features`) as string[]).map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 mt-0.5 shrink-0 text-accent-indigo"
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
                    <span className="text-fg-secondary">{f}</span>
                  </li>
                ))}
              </ul>

              {/* BETA-GAP-13: CTA + rodapés num container de rodapé com altura
                  MÍNIMA RESERVADA para que o y do CTA seja idêntico nos 3 cards
                  (free sem rodapé; plus/premium com 2 linhas de largura variável). */}
              <div className="mt-auto">
                <div className="mb-3" data-testid={`plan-footer-${plan.id}`}>
                  {plan.price > 0 && (
                    <p className="text-xs text-fg-secondary text-center mt-3">
                      {t("securePayment")}
                    </p>
                  )}

                  {/* T418/D-395 + parecer jurídico: trial/renovação/cancelamento
                      explícitos ANTES do clique (nunca consequência escondida). */}
                  {plan.id === "plus" && plan.price > 0 && (
                    <p className="text-xs text-fg-muted text-center mt-2 leading-relaxed">
                      {t("trialPlus", {
                        value: `${formatPlanPrice(plan.price, locale, currencySymbol)}/${t("month")}`,
                      })}
                    </p>
                  )}
                  {plan.id === "premium" && (
                    <p className="text-xs text-fg-muted text-center mt-2 leading-relaxed">
                      {t("renewInfo", {
                        value: `${formatPlanPrice(plan.price, locale, currencySymbol)}/${t("month")}`,
                      })}
                    </p>
                  )}
                </div>

                <Link
                  href={
                    plan.price === 0 ? "/register" : `/checkout/${plan.id}?billing=${safeBilling}`
                  }
                  data-testid={`plan-cta-${plan.id}`}
                  className={`mt-3 block text-center py-2.5 rounded-lg text-sm font-semibold transition-[filter,background-color] duration-300 ${
                    isPlus
                      ? "bg-accent-indigo text-accent-indigo-foreground hover:brightness-110"
                      : "bg-surface-elevated text-fg-primary hover:bg-surface-border"
                  }`}
                >
                  {plan.price === 0 ? t("startFree") : loggedIn ? t("upgrade") : t("subscribe")}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
