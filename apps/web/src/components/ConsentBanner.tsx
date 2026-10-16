"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { useConsentStore } from "@/stores/use-consent-store";

/**
 * T432 (D-422) — banner de consentimento (Privacy Center).
 *
 * - Primeira visita (sem cookie mr_consent): Aceitar todos / Recusar (só
 *   necessários) / Gerenciar.
 * - Gerenciar: dialog com toggles de Analytics (PostHog) e Monitoramento
 *   (Sentry), livres e revogáveis (recusar tão fácil quanto aceitar).
 * - Escolha persistida via useConsentStore (cookie first-party mr_consent).
 */
export function ConsentBanner() {
  const t = useTranslations("consent");
  const { decided, setConsent } = useConsentStore();
  // Hidratação (fix): o servidor NÃO vê document.cookie (mr_consent), então SEMPRE
  // renderizava o banner; na hidratação o cliente lê o cookie (decided=true) e quer
  // null → mismatch → o banner "ficava" após o refresh. Solução: só renderizar APÓS
  // o mount (cliente), evitando o mismatch e a exibição com consentimento persistido.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (decided) return null;

  const aceitarTodos = () => setConsent({ analytics: true, monitoring: true });
  const recusar = () => setConsent({ analytics: false, monitoring: false });

  return (
    // T474 (a11y): este banner NÃO é modal. `aria-modal="true"` instrui leitores
    // de tela a ignorarem todo o resto da árvore de acessibilidade enquanto ele
    // estiver aberto — na primeira visita isso escondia toda a landing page de
    // tecnologia assistiva até o consentimento ser dado. O banner fica ancorado
    // no rodapé do viewport e não bloqueia interação, então a semântica correta
    // é `role="region"` com rótulo (uma seção nomeada da página).
    <div
      role="region"
      aria-label={t("title")}
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px] z-50 rounded-lg border border-[#2A2A3D] bg-[#0B0B13] p-5 text-[#F5F5F7] shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-semibold">{t("title")}</h2>
          <p className="mt-1 text-xs text-[#A0A0B8]">{t("body")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={aceitarTodos}
          className="rounded-md bg-[#818CF8] px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:brightness-110"
        >
          {t("acceptAll")}
        </button>
        <button
          type="button"
          onClick={recusar}
          className="rounded-md border border-[#2A2A3D] px-3 py-1.5 text-xs text-[#A0A0B8] hover:text-[#F5F5F7]"
        >
          {t("decline")}
        </button>
        {/* D-622: "Gerenciar" deixa de abrir um painel que só existia aqui (e desaparecia
            com o banner) e passa a levar à rota permanente `/cookies/gerenciar`, que usa o
            componente `ConsentPreferences`. Uma só superfície de gestão granular. */}
        <Link
          href="/cookies/gerenciar"
          className="rounded-md border border-[#2A2A3D] px-3 py-1.5 text-xs text-[#A0A0B8] hover:text-[#F5F5F7]"
        >
          {t("manage")}
        </Link>
      </div>
    </div>
  );
}
