"use client";

import { useTranslations } from "next-intl";
import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useAuthStore } from "../../../../stores/use-auth-store";
import { getCsrfToken } from "../../../../lib/http";

/**
 * Página de checkout Stripe (T5.3).
 *
 * Redireciona para Stripe Checkout chamando POST /api/v1/checkout.
 * Em produção, usa @stripe/stripe-js loadStripe().
 */
export default function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; plan: string }>;
}) {
  const { plan, locale } = use(params);
  const planKey = plan.toUpperCase();
  const t = useTranslations("checkout");
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/register?callbackUrl=/checkout/${planKey}`);
    }
  }, [isAuthenticated, router, planKey]);

  if (!isAuthenticated) return null;

  const isValidPlan = planKey === "PLUS" || planKey === "PREMIUM";

  async function handleCheckout() {
    if (!isValidPlan) return;
    setLoading(true);
    setError(null);
    try {
      // T325: CSRF double-submit — o guard global exige X-CSRF-Token em POST.
      const csrf = getCsrfToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      };
      if (csrf) headers["X-CSRF-Token"] = csrf;
      const response = await fetch("/api/v1/checkout", {
        method: "POST",
        headers,
        credentials: "include", // envia cookie httpOnly de sessão
        body: JSON.stringify({
          plano: planKey,
          // T423: período de cobrança (month|year) — repassa a escolha do
          // toggle do /pricing; o backend mapeia STRIPE_PRICE_<PLANO>_<MONTH|YEAR>_<MOEDA>.
          periodo:
            new URLSearchParams(window.location.search).get("billing") === "annual"
              ? "year"
              : "month",
          success_url: `${window.location.origin}/${locale}/pricing?status=success`,
          cancel_url: `${window.location.origin}/${locale}/pricing?status=canceled`,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: t("unknownError") }));
        throw new Error(err.message ?? t("loadFailed"));
      }

      const data = await response.json();
      // Redireciona para Stripe Checkout URL.
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unknownError"));
      setLoading(false);
    }
  }

  if (!isValidPlan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-[#F5F5F7]">{t("invalidPlan")}</h1>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* T211: a rota usava `text-gray-900 dark:text-gray-100` + `bg-white
          dark:bg-gray-800` — o app é dark-only (globals.css) e o Tailwind está em
          darkMode "media", então com o SO em modo claro o card ficava BRANCO e o
          texto escuro sobre fundo escuro. Tudo aqui passou a usar os tokens. */}
      <h1 className="text-3xl font-heading font-bold text-center mb-8 text-[#F5F5F7]">
        {t("title")}
      </h1>

      <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-8 shadow-surface-2">
        <h2 className="text-2xl font-heading font-semibold mb-4 text-[#F5F5F7]">
          {planKey === "PLUS" ? t("plus") : t("premium")}
        </h2>

        <ul role="list" className="space-y-2 mb-6 text-sm text-[#A0A0B8]">
          {planKey === "PLUS" && (
            <>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {t("plusB1")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {t("plusB2")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {t("plusB3")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {t("plusB4")}
              </li>
            </>
          )}
          {planKey === "PREMIUM" && (
            <>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {t("premB1")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {t("premB2")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {t("premB3")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {t("premB4")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {t("premB5")}
              </li>
            </>
          )}
        </ul>

        {/* T211: era `bg-primary-700 … hover:bg-primary-800 focus:ring-primary-700`
            — nenhuma dessas classes existe no tailwind.config.ts, então a CTA
            principal do checkout ficava SEM fundo e SEM anel de foco. Agora usa o
            CTA canônico (rose + foco índigo), igual ao da hero. */}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-8 py-3.5 text-sm font-semibold text-white transition-[filter] duration-200 hover:brightness-110 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#818CF8]"
        >
          {loading ? t("redirecting") : t("subscribe", { plan: planKey })}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-sm text-[#F87171]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
