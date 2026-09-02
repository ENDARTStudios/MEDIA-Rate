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
  // Registro granular + versionado + timestamp + locale (D-425): prova qual
  // finalidade foi autorizada, quando e em que idioma.
  const record = {
    analytics: c.analytics,
    monitoring: c.monitoring,
    v: 1,
    ts: Math.floor(Date.now() / 1000),
    lang: typeof document !== "undefined" ? document.documentElement.lang || "pt-BR" : "pt-BR",
  };
  const v = encodeURIComponent(JSON.stringify(record));
  document.cookie = `${COOKIE}=${v}; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

/** Limpa resíduos de consentimento antigo/analytics sem consentimento
 *  (D-425): flag antiga `lgpd-consent-v1` e cookies `ph_*` do PostHog
 *  que possam ter sido criados em sessões anteriores. */
function limparResiduos() {
  if (typeof document === "undefined") return;
  try {
    localStorage.removeItem("lgpd-consent-v1");
  } catch {
    void 0; /* localStorage indisponível */
  }
  document.cookie.split(";").forEach((c) => {
    const nome = c.trim().split("=")[0];
    if (nome.startsWith("ph_")) {
      document.cookie = nome + "=; SameSite=Lax; Path=/; Max-Age=0";
    }
  });
}

export const useConsentStore = create<ConsentState>((set) => ({
  ...lerCookie(),
  setConsent: (c) => {
    gravar(c);
    if (!c.analytics) limparResiduos();
    set({ analytics: c.analytics, monitoring: c.monitoring, decided: true });
  },
  reset: () => {
    // revoga: remove cookie e volta ao default (privacy by default)
    document.cookie = `${COOKIE}=; SameSite=Lax; Path=/; Max-Age=0`;
    limparResiduos();
    set({ analytics: false, monitoring: false, decided: false });
  },
}));
