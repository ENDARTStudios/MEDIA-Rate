"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

/**
 * T361 (D-335) — login social: Google real (Google Identity Services) e
 * Apple "em breve" (adiado por custo — T361b futuro).
 * O ID token do Google é validado SERVER-SIDE (POST /auth/google/callback);
 * o frontend nunca confia no payload.
 */
export function SocialButtons() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { fetchMe } = useAuthStore();
  const btnRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;

    const initGoogle = () => {
      if (cancelled || !window.google || !btnRef.current) return;
      window.google.accounts.id.initialize({
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
            // T389: primeiro login Google também cai na /welcome (acolhimento).
            router.replace(data.is_new_user ? "/welcome" : "/dashboard");
          } catch {
            toast.error(t("loginError"));
          } finally {
            setBusy(false);
          }
        },
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "filled_black",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    };

    if (window.google) {
      initGoogle();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT}"]`);
      if (!existing) {
        const script = document.createElement("script");
        script.src = GIS_SCRIPT;
        script.async = true;
        script.defer = true;
        script.onload = initGoogle;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [busy, fetchMe, router, t]);

  const handleApple = () => {
    toast.message(`Apple: ${t("socialComingSoon")}`, {
      description: t("socialIntegrating"),
    });
  };

  return (
    <div className="space-y-2">
      <div ref={btnRef} className="[&>div]:w-full" />
      <button
        type="button"
        onClick={handleApple}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border/30 bg-[#131331] px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-surface-elevated"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
          />
        </svg>
        {t("continueWithApple")}
      </button>
    </div>
  );
}
