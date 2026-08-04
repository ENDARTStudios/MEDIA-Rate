"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { useAuthStore } from "@/stores/use-auth-store";
import { Clapperboard, Tv, Gamepad2, BookOpen, BookImage, BookMarked, Lock } from "lucide-react";
import type { MediaType } from "@/lib/types";
import { MEDIA_ACCENTS } from "@/components/media-rate-ui/CategoryChip";

type Billing = "monthly" | "annual";

const PLANS = [
  { id: "free", price: 0, highlighted: false },
  { id: "plus", price: 4.9, highlighted: true },
  { id: "premium", price: 9.9, highlighted: false },
] as const;

const ANNUAL_DISCOUNT = 0.85;

/** Mídias desbloqueadas por plano (Parte 3.7). */
const PLAN_MEDIA: Record<string, MediaType[]> = {
  free: ["movie", "series", "game"],
  plus: ["movie", "series", "game", "book", "comic"],
  premium: ["movie", "series", "game", "book", "comic", "anime"],
};

const MEDIA_ICONS: Record<MediaType, typeof Clapperboard> = {
  movie: Clapperboard,
  series: Tv,
  game: Gamepad2,
  book: BookOpen,
  comic: BookImage,
  anime: BookMarked,
};

function formatPrice(price: number, locale: string) {
  const currency = locale === "pt-BR" ? "BRL" : locale === "en-US" ? "USD" : "EUR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: price === 0 ? 0 : 2,
  }).format(price);
}

function MediaUnlockRow({ planId }: { planId: string }) {
  const unlocked = PLAN_MEDIA[planId] ?? [];
  const all: MediaType[] = ["movie", "series", "game", "book", "comic", "anime"];
  return (
    <div
      className="flex items-center justify-center gap-2 py-3"
      role="group"
      aria-label="Mídias desbloqueadas"
      data-testid={`media-unlock-${planId}`}
    >
      {all.map((type) => {
        const Icon = MEDIA_ICONS[type];
        const isUnlocked = unlocked.includes(type);
        return (
          <span
            key={type}
            className="relative flex h-7 w-7 items-center justify-center rounded-full border"
            style={{
              borderColor: isUnlocked ? `${MEDIA_ACCENTS[type]}55` : "#2A2A3D",
              color: isUnlocked ? MEDIA_ACCENTS[type] : "#6B6B85",
              opacity: isUnlocked ? 1 : 0.55,
            }}
            title={isUnlocked ? type : `${type} — bloqueado neste plano`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {!isUnlocked && (
              <Lock
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#12121C] p-px"
                aria-hidden="true"
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

export function PricingCards() {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const { isAuthenticated } = useAuthStore();
  const shouldReduce = useReducedMotion();
  const [billing, setBilling] = useState<Billing>("monthly");

  const effectivePrice = useMemo(
    () => (plan: number) =>
      billing === "annual" && plan > 0 ? Math.round(plan * 12 * ANNUAL_DISCOUNT * 100) / 100 : plan,
    [billing],
  );

  return (
    <div>
      {/* Toggle mensal/anual com economia destacada (Parte 3.7) */}
      <div
        className="mb-10 flex items-center justify-center gap-3"
        role="group"
        aria-label="Periodicidade"
      >
        {(["monthly", "annual"] as Billing[]).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBilling(b)}
            aria-pressed={billing === b}
            className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] ${
              billing === b
                ? "bg-[#818CF8] text-[#0F172A]"
                : "bg-[#1B1B2C] text-[#A0A0B8] hover:text-[#F5F5F7]"
            }`}
          >
            {t("month")}
            {b === "annual" && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  billing === b ? "bg-black/20" : "bg-[#34D399]/15 text-[#34D399]"
                }`}
              >
                -15%
              </span>
            )}
          </button>
        ))}
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
              className={`relative rounded-md border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                isPlus
                  ? "bg-[#12121C] border-[rgba(129,140,248,0.2)]"
                  : "bg-[#12121C] border-[#2A2A3D] hover:border-[rgba(129,140,248,0.3)]"
              }`}
            >
              {isPlus && (
                <>
                  <GlowingEffect spread={40} proximity={64} borderWidth={3} glow />
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#818CF8] text-[#0F172A] text-xs font-semibold rounded-full z-10">
                    {t("mostPopular")}
                  </span>
                </>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-heading font-bold text-[#F5F5F7] capitalize">
                  {t(plan.id)}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${plan.id}-${billing}`}
                      initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduce ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="text-4xl font-heading font-bold text-[#F5F5F7] tabular-nums"
                    >
                      {billing === "annual" && plan.price > 0
                        ? formatPrice(annualTotal, locale)
                        : formatPrice(price, locale)}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-sm text-[#A0A0B8]">
                    /{billing === "annual" ? t("year") : t("month")}
                  </span>
                </div>
                <p className="text-xs text-[#6B6B85] mt-0.5">
                  {plan.price === 0
                    ? t("noCard")
                    : billing === "annual"
                      ? t("savePercent", { pct: 15 })
                      : `${formatPrice(plan.price * 12 * ANNUAL_DISCOUNT, locale)}/${t("year")} (${t("savePercent", { pct: 15 })})`}
                </p>
              </div>

              {/* Grade de mídias desbloqueadas (Parte 3.7) */}
              <div className="mb-4 rounded-lg border border-[#2A2A3D] bg-[#1B1B2C]/50">
                <MediaUnlockRow planId={plan.id} />
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
                    <span className="text-[#A0A0B8]">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.price === 0 ? "/register" : `/checkout/${plan.id}`}
                className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  isPlus
                    ? "bg-[#818CF8] text-[#0F172A] hover:brightness-110"
                    : "bg-[#1B1B2C] text-[#F5F5F7] hover:bg-[#2A2A3D]"
                }`}
              >
                {plan.price === 0 ? t("startFree") : loggedIn ? t("upgrade") : t("subscribe")}
              </Link>

              {plan.price > 0 && (
                <p className="text-xs text-[#A0A0B8] text-center mt-3">{t("securePayment")}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
