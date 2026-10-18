"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useConsentStore } from "@/stores/use-consent-store";

/**
 * T211/D-622 — preferências de consentimento (uma só fonte de verdade).
 *
 * Antes os toggles existiam **apenas dentro do `ConsentBanner`**, que some depois da primeira
 * decisão (`if (decided && !open) return null`): quem aceitou ou recusou **não tinha como mudar
 * de ideia** — o direito de revogar consentimento ficava sem porta de entrada (P1 registrado nas
 * specs de Cookies e Gerenciar Cookies).
 *
 * Este componente é usado nos dois lugares:
 *   - `ConsentBanner` (primeira visita, dentro do banner que não é modal — T474);
 *   - `/cookies/gerenciar` (a página permanente, alcançável a qualquer momento).
 *
 * Regras preservadas do banner original: as categorias vivem no `useConsentStore` (cookie
 * first-party, lido pelo middleware), o padrão é **privacidade por padrão** (analytics e
 * monitoramento `false` sem escolha) e recusar é tão fácil quanto aceitar.
 */
export function ConsentPreferences({ onSaved }: { onSaved?: () => void }) {
  const t = useTranslations("consent");
  const { analytics, monitoring, setConsent } = useConsentStore();
  const [analyticsPref, setAnalyticsPref] = useState(analytics);
  const [monitoringPref, setMonitoringPref] = useState(monitoring);

  function aceitarTodos() {
    setConsent({ analytics: true, monitoring: true });
    toast.success(t("saved"));
    onSaved?.();
  }

  function recusar() {
    setConsent({ analytics: false, monitoring: false });
    toast.success(t("saved"));
    onSaved?.();
  }

  function salvar() {
    setConsent({ analytics: analyticsPref, monitoring: monitoringPref });
    toast.success(t("saved"));
    onSaved?.();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span>{t("necessary")}</span>
          <span className="shrink-0 text-accent-indigo">{t("alwaysOn")}</span>
        </div>
        <label className="flex items-center justify-between gap-4">
          <span>{t("analytics")}</span>
          <input
            type="checkbox"
            checked={analyticsPref}
            onChange={(e) => setAnalyticsPref(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-accent-indigo"
            aria-label={t("analytics")}
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>{t("monitoring")}</span>
          <input
            type="checkbox"
            checked={monitoringPref}
            onChange={(e) => setMonitoringPref(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-accent-indigo"
            aria-label={t("monitoring")}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={aceitarTodos}
          className="rounded-md bg-accent-indigo px-3 py-1.5 text-xs font-semibold text-accent-indigo-foreground hover:brightness-110"
        >
          {t("acceptAll")}
        </button>
        <button
          type="button"
          onClick={recusar}
          className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-fg-secondary hover:text-fg-primary"
        >
          {t("decline")}
        </button>
        <button
          type="button"
          onClick={salvar}
          className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-fg-secondary hover:text-fg-primary"
        >
          {t("save")}
        </button>
      </div>
    </div>
  );
}
