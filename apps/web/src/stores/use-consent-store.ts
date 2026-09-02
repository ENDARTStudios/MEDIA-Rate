"use client";

import { create } from "zustand";

/**
 * T432 (D-422) — consentimento de privacidade (Privacy Center).
 *
 * - Cookie first-party `mr_consent` (sem exigir consentimento) persiste a
 *   escolha. Categorias: `necessary` (sempre ativas: sess/refresh/mr_auth/
 *   auth social), `analytics` (PostHog), `monitoring` (Sentry).
 * - PRIVACY BY DEFAULT: sem cookie, Analytics e Monitoramento são FALSE
 *   (scripts opcionais NÃO carregam até o usuário aceitar).
 * - `decided` = existe cookie (banner já foi mostrado/respondido).
 */
export interface ConsentState {
  analytics: boolean;
  monitoring: boolean;
  /** true se o usuário já respondeu (cookie presente) → não mostra o banner. */
  decided: boolean;
  setConsent: (c: { analytics: boolean; monitoring: boolean }) => void;
  reset: () => void;
}

const COOKIE = "mr_consent";
const MAX_AGE = 31536000; // 1 ano

function lerCookie(): Pick<ConsentState, "analytics" | "monitoring" | "decided"> {
  if (typeof document === "undefined")
    return { analytics: false, monitoring: false, decided: false };
  const m = document.cookie.match(/(?:^|;\s*)mr_consent=([^;]+)/);
  if (!m) return { analytics: false, monitoring: false, decided: false };
  try {
    const o = JSON.parse(decodeURIComponent(m[1]));
    return {
      analytics: !!o.analytics,
      monitoring: !!o.monitoring,
      decided: true,
    };
  } catch {
    return { analytics: false, monitoring: false, decided: false };
  }
}

function gravar(c: { analytics: boolean; monitoring: boolean }) {
  const v = encodeURIComponent(
    JSON.stringify({ analytics: c.analytics, monitoring: c.monitoring, v: 1 }),
  );
  document.cookie = `${COOKIE}=${v}; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

export const useConsentStore = create<ConsentState>((set) => ({
  ...lerCookie(),
  setConsent: (c) => {
    gravar(c);
    set({ analytics: c.analytics, monitoring: c.monitoring, decided: true });
  },
  reset: () => {
    // revoga: remove cookie e volta ao default (privacy by default)
    document.cookie = `${COOKIE}=; SameSite=Lax; Path=/; Max-Age=0`;
    set({ analytics: false, monitoring: false, decided: false });
  },
}));
