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

  return (
    <div className="space-y-2">
      {/* T408: botão "Continue with Apple" removido — era um botão morto
          (toast 'em breve'); volta quando o OAuth Apple for implementado. */}
      {/* T424/align: centraliza o botão GSI e preenche a largura do form
          (antes o width:320 fixo do GSI ficava à esquerda da coluna). */}
      {/* GSI injeta um <iframe> com width fixo (inline). Forçamos o iframe a
          w-full (!) para o botão igualar a largura da caixa do form (T424/align). */}
      <div
        ref={btnRef}
        className="w-full [&_iframe]:!w-full [&_div>iframe]:!w-full [&_iframe]:!block"
      />
    </div>
  );
}
