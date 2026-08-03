"use client";

import { useTranslations } from "next-intl";
import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../../stores/use-auth-store";

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
      const response = await fetch("/api/v1/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        credentials: "include", // envia cookie httpOnly de sessão
        body: JSON.stringify({
          plano: planKey,
          success_url: `${window.location.origin}/${locale}/pricing?status=success`,
          cancel_url: `${window.location.origin}/${locale}/pricing?status=canceled`,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Erro" }));
        throw new Error(err.message ?? "Falha no checkout");
      }

      const data = await response.json();
      // Redireciona para Stripe Checkout URL.
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setLoading(false);
    }
  }

  if (!isValidPlan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Plano inválido</h1>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
        {t("title")}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {planKey === "PLUS" ? t("plus") : t("premium")}
        </h2>

        <ul className="space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-400">
          {planKey === "PLUS" && (
            <>
              <li>✓ Watchlist até 100 itens</li>
              <li>✓ Recomendações avançadas</li>
              <li>✓ Histórico de MEDIA Score</li>
              <li>✓ Sem anúncios</li>
            </>
          )}
          {planKey === "PREMIUM" && (
            <>
              <li>✓ Watchlist ilimitada</li>
              <li>✓ Recomendações ML personalizadas</li>
              <li>✓ Histórico de MEDIA Score</li>
              <li>✓ Filtros avançados</li>
              <li>✓ Sem anúncios</li>
            </>
          )}
        </ul>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-primary-700 text-white font-semibold py-3 rounded-md hover:bg-primary-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-700"
        >
          {loading ? t("redirecting") : t("subscribe", { plan: planKey })}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
