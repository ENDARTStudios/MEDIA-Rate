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
  prompt: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

export function SocialButtons() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { fetchMe } = useAuthStore();
  const googleRef = useRef<GsiId | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;

    const initGoogle = () => {
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
      googleRef.current = gsi;
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

  const handleGoogle = () => {
    if (busy) return;
    googleRef.current?.prompt();
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="w-full flex items-center justify-center gap-3 px-3 py-3 bg-[#09090F] border border-[rgba(129,140,248,0.08)] rounded-lg text-sm font-medium text-[#EDE7DC] transition-colors duration-200 hover:border-[#818CF8] hover:ring-2 hover:ring-[#818CF8]/20 focus:outline-none focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8]/20 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        <span>{t("continueWithGoogle")}</span>
      </button>
    </div>
  );
}
