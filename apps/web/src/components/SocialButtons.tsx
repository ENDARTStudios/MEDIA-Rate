"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, setCsrfToken } from "@/lib/http";
import { useAuthStore } from "@/stores/use-auth-store";

interface GsiCredentialResponse {
  credential: string;
}

interface GsiIdConfiguration {
  client_id: string;
  callback: (response: GsiCredentialResponse) => void;
}

interface GsiId {
  initialize: (config: GsiIdConfiguration) => void;
  /** T-UG01 fix: renderiza o botão oficial do Google (iframe GSI). */
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: string;
      theme?: string;
      size?: string;
      text?: string;
      shape?: string;
      locale?: string;
      width?: number;
    },
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

export function SocialButtons() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const { fetchMe } = useAuthStore();
  const gsiBtnRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  // BETA-GAP-01/T120: `NEXT_PUBLIC_*` é inlinado em build-time. Sem client id
  // (ex.: preview/local sem a var) o provider está DESABILITADO — nunca
  // renderizar botão que não faz nada (promessa falsa).
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;

    // UG-01 fix (2026-10-03): init + renderButton no MESMO boot, em TODOS os
    // caminhos. Antes o renderButton só rodava se window.google já existisse;
    // no carregamento a frio (sempre o caso em produção — nada pré-carrega o
    // GSI) o onload chamava só o initialize e o botão oficial nunca aparecia,
    // sobrando o botão custom cujo prompt() One Tap é suprimido pelo browser.
    const bootGoogle = () => {
      if (cancelled || !window.google) return;
      const gsi = window.google.accounts.id;
      gsi.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (busy) return;
          setBusy(true);
          try {
            const data = await api.post<{ csrf_token?: string; is_new_user?: boolean }>(
              "/api/v1/auth/google/callback",
              { credential: response.credential },
              { auth: false },
            );
            if (data.csrf_token) setCsrfToken(data.csrf_token);
            await fetchMe();
            if (typeof document !== "undefined") {
              document.cookie = "mr_auth=1; SameSite=Lax; Secure; Path=/; max-age=86400";
            }
            toast.success(t("loginSuccess"));
            router.replace(data.is_new_user ? "/welcome" : "/dashboard");
          } catch {
            toast.error(t("loginError"));
          } finally {
            setBusy(false);
          }
        },
      });
      const container = gsiBtnRef.current;
      // O efeito re-roda quando `busy` muda — não re-renderizar o iframe já
      // existente (renderButton duplicaria o botão).
      if (container && container.childElementCount === 0) {
        try {
          gsi.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            locale,
            width: Math.min(340, container.clientWidth || 340),
          });
        } catch {
          // renderButton pode falhar se já renderizado — o container já tem o botão
        }
      }
    };

    if (window.google) {
      bootGoogle();
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = GIS_SCRIPT;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      // Cobre também o script ainda carregando (presente no DOM, sem onload
      // nosso): o boot roda quando o GSI terminar.
      script.addEventListener("load", bootGoogle);
    }

    return () => {
      cancelled = true;
    };
  }, [busy, clientId, fetchMe, locale, router, t]);

  // Provider desabilitado → não renderiza botão nem o divisor "ou".
  if (!clientId) return null;

  return (
    <>
      {/* Botão GSI oficial (iframe do Google) — abre o chooser de contas de
          forma confiável; o botão custom com prompt() foi removido (UG-01:
          One Tap é suprimido em vários contextos e o clique não fazia nada). */}
      <div
        ref={gsiBtnRef}
        className="flex min-h-[44px] items-center justify-center"
        data-testid="gsi-button"
      />
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-surface-border/30" />
        <span className="text-xs text-[#6B7280]">{t("or")}</span>
        <div className="flex-1 h-px bg-surface-border/30" />
      </div>
    </>
  );
}
