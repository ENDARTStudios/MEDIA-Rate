"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/use-auth-store";
import { useRouter, usePathname } from "next/navigation";
import { Link } from "@/lib/navigation";
import { ProtectedPage } from "@/components/ProtectedPage";
import { getCsrfToken } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { LgpdControls } from "@/components/settings/LgpdControls";
import { useConsentStore } from "@/stores/use-consent-store";

/**
 * D-583.4 (T211): o preview do próximo plano exibia um score **inventado**
 * (`FREE: 7.9`, `PLUS: 9.4`) dentro de um `ScoreDial`. Número de marketing
 * precisa ser derivado de dado real (regra do projeto) e o hover do dial ainda
 * preenchia o breakdown com `[40,40,20]` fixos — "nota de exemplo apresentada
 * como real". O preview passou a ser não numérico: cadeado + nomes dos recursos.
 */
const NEXT_TIER: Record<string, { plan: "PLUS" | "PREMIUM" } | null> = {
  FREE: { plan: "PLUS" },
  PLUS: { plan: "PREMIUM" },
  PREMIUM: null,
};

export default function SettingsPage() {
  const ts = useTranslations("settings");
  const tp = useTranslations("pricing");
  const tn = useTranslations("nav");
  const tc = useTranslations("consent");
  const tCommon = useTranslations("common");
  const {
    analytics: consentAnalytics,
    monitoring: consentMonitoring,
    setConsent: setConsentPrefs,
  } = useConsentStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const currentLocale = pathname.split("/")[1] ?? "pt-BR";
  const locales = ["pt-BR", "en-US", "es-ES"];

  const nextTier = user?.plan ? (NEXT_TIER[user.plan] ?? null) : null;
  const hasPaidPlan = user?.plan === "PLUS" || user?.plan === "PREMIUM";

  // D-619 (P1 da spec 25): `window.confirm`/`alert()` são diálogos nativos — não seguem o
  // tema, não são estilizáveis e têm suporte irregular em tecnologia assistiva. O repo já
  // tem `ConfirmDialog` (Radix, foco preso) e `sonner` (o `<Toaster />` está no layout).
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  async function cancelarAssinatura() {
    setConfirmarCancelamento(false);
    setCancelando(true);
    const csrf = getCsrfToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    };
    if (csrf) headers["X-CSRF-Token"] = csrf;
    try {
      const res = await fetch("/api/v1/billing/cancel", {
        method: "POST",
        headers,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(ts("cancelDone"));
        router.refresh();
      } else {
        toast.error(data?.message ?? ts("cancelError"));
      }
    } catch {
      toast.error(ts("cancelError"));
    } finally {
      setCancelando(false);
    }
  }

  return (
    <ProtectedPage>
      <div className="max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-8">{ts("title")}</h1>

        <div className="space-y-6">
          {user?.trialEnded && (
            <div
              role="status"
              className="flex flex-col gap-3 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-5"
            >
              <p className="text-sm text-[#F5F5F7]">{ts("trialEnded")}</p>
              <Link
                href="/pricing"
                className="inline-block w-fit rounded-md bg-[#818CF8] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:brightness-110 transition-[filter]"
              >
                {ts("trialEndedCta")}
              </Link>
            </div>
          )}

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">Plano</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#A0A0B8]">Plano atual</span>
              <span className="rounded-full bg-[#1B1B2C] px-3 py-1 text-sm font-semibold text-[#F5F5F7] border border-[#2A2A3D]">
                {user?.plan ?? "FREE"}
              </span>
            </div>

            {hasPaidPlan && (
              <div className="mt-5 border-t border-[#2A2A3D] pt-4">
                <button
                  type="button"
                  onClick={() => setConfirmarCancelamento(true)}
                  disabled={cancelando}
                  className="text-sm text-[#EF4444] hover:text-[#F87171] underline underline-offset-4 disabled:opacity-60"
                  data-testid="cancel-subscription"
                >
                  {ts("cancelSubscription")}
                </button>
                <p className="mt-1.5 text-xs text-[#A0A0B8]">{ts("cancelHint")}</p>
                <ConfirmDialog
                  open={confirmarCancelamento}
                  onOpenChange={setConfirmarCancelamento}
                  title={ts("cancelSubscription")}
                  description={ts("cancelConfirm")}
                  confirmLabel={ts("cancelSubscription")}
                  cancelLabel={tCommon("cancel")}
                  variant="destructive"
                  onConfirm={() => void cancelarAssinatura()}
                />
              </div>
            )}

            {nextTier && (
              <div className="mt-5 flex items-center gap-5 rounded-lg border border-dashed border-[#2A2A3D] bg-[#1B1B2C]/40 p-5">
                {/* D-583.4 (T211): preview do próximo plano sem número inventado —
                    cadeado + rótulo acessível no lugar do dial com score fictício. */}
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#2A2A3D] bg-[#12121C]"
                  role="img"
                  aria-label={ts("lockedFeatures")}
                >
                  <Lock className="h-5 w-5 text-[#A0A0B8]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#F5F5F7]">
                    {tp(nextTier.plan.toLowerCase())}
                  </p>
                  <p className="mt-1 text-xs text-[#A0A0B8]">
                    Desbloqueie recomendações ilimitadas, watchlist completa e mais com o{" "}
                    {tp(nextTier.plan.toLowerCase())}.
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-3 inline-block rounded-md bg-[#818CF8] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:brightness-110 transition-[filter]"
                  >
                    {tp("upgrade")}
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
              {ts("account")}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0B8]">{ts("name")}</span>
                <span className="text-[#F5F5F7]">{user?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0B8]">{ts("email")}</span>
                <span className="text-[#F5F5F7]">{user?.email ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
              {ts("language")}
            </h2>
            <p className="text-sm text-[#A0A0B8] mb-3">{ts("languageHint")}</p>
            <div className="flex gap-2">
              {locales.map((loc) => (
                <Button
                  key={loc}
                  variant={currentLocale === loc ? "default" : "outline"}
                  size="sm"
                  onClick={() => router.push(`/${loc}/settings`)}
                >
                  {loc}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-1">
              {tc("title")}
            </h2>
            <p className="text-sm text-[#A0A0B8] mb-4">{tc("body")}</p>
            <div className="space-y-3 text-sm">
              <label className="flex items-center justify-between">
                <span className="text-[#F5F5F7]">{tc("analytics")}</span>
                <input
                  type="checkbox"
                  checked={consentAnalytics}
                  onChange={(e) =>
                    setConsentPrefs({ analytics: e.target.checked, monitoring: consentMonitoring })
                  }
                  className="h-4 w-4 accent-[#818CF8]"
                  aria-label={tc("analytics")}
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-[#F5F5F7]">{tc("monitoring")}</span>
                <input
                  type="checkbox"
                  checked={consentMonitoring}
                  onChange={(e) =>
                    setConsentPrefs({ analytics: consentAnalytics, monitoring: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#818CF8]"
                  aria-label={tc("monitoring")}
                />
              </label>
              <p className="text-xs text-[#A0A0B8]">{tc("necessary")}</p>
            </div>
          </div>

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">{ts("lgpd")}</h2>
            <p className="text-sm text-[#A0A0B8] mb-4">{ts("lgpdHint")}</p>
            <LgpdControls />
          </div>

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
              {ts("session")}
            </h2>
            <Button
              variant="destructive"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              {tn("logout") ?? ts("session")}
            </Button>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
