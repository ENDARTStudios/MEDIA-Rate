"use client";

import { create } from "zustand";
import {
  migrarConsentimento,
  registrarRevogacaoV2,
  type ConsentV2,
} from "../lib/consent-migration";

/**
 * T432 (D-422) / T470 (D-531) — consentimento granular v2 (Privacy Center).
 *
 * - Fonte de verdade no CLIENTE: localStorage `mr_consent_v2` (schema
 *   versionado com metadados + trail de revogações — ver
 *   `lib/consent-migration.ts`).
 * - Cookie first-party `mr_consent` (v1) permanece como espelho SSR-compatível
 *   com as categorias (middleware/providers o leem sem localStorage).
 * - Migração (D-531): cookie v1 granular → v2 PRESERVANDO categorias;
 *   flag genérica `lgpd-consent-v1` NUNCA herdada como granular (purge +
 *   banner reexibido); v2 corrompido → reexibir.
 * - PRIVACY BY DEFAULT: sem escolha, Analytics e Monitoramento são FALSE.
 * - Espelhamento server-side: `POST /api/v1/consent` (consent_logs
 *   append-only, T442/T443) quando autenticado — fire-and-forget.
 */

export interface ConsentState {
  analytics: boolean;
  monitoring: boolean;
  /** true se o usuário já respondeu (v2 válido ou migrado) → banner oculto. */
  decided: boolean;
  /** Estado v2 completo quando disponível (null = ainda não decidido). */
  estadoV2: ConsentV2 | null;
  setConsent: (c: { analytics: boolean; monitoring: boolean }) => void;
  /** Revoga TUDO (privacy by default) — banner reexibido. */
  reset: () => void;
}

const COOKIE = "mr_consent";
const LS_V2 = "mr_consent_v2";
const LS_V1_GENERICO = "lgpd-consent-v1";
const MAX_AGE = 31536000; // 1 ano

interface Fontes {
  v2Bruto: unknown;
  v1Cookie: { analytics: boolean; monitoring: boolean } | null;
  lgpdV1: string | null;
}

function lerFontes(): Fontes {
  if (typeof window === "undefined")
    return { v2Bruto: null, v1Cookie: null, lgpdV1: null };
  let v2Bruto: unknown = null;
  try {
    const raw = window.localStorage.getItem(LS_V2);
    if (raw) v2Bruto = JSON.parse(raw);
  } catch {
    v2Bruto = null; // JSON corrompido → trata como ausente (reexibe banner)
  }
  let v1Cookie: { analytics: boolean; monitoring: boolean } | null = null;
  try {
    const m = document.cookie.match(/(?:^|;\s*)mr_consent=([^;]+)/);
    if (m) {
      const o = JSON.parse(decodeURIComponent(m[1]));
      if (typeof o.analytics === "boolean" && typeof o.monitoring === "boolean")
        v1Cookie = { analytics: o.analytics, monitoring: o.monitoring };
    }
  } catch {
    v1Cookie = null;
  }
  let lgpdV1: string | null = null;
  try {
    lgpdV1 = window.localStorage.getItem(LS_V1_GENERICO);
  } catch {
    lgpdV1 = null;
  }
  return { v2Bruto, v1Cookie, lgpdV1 };
}

function idiomaAtual(): string {
  if (typeof document === "undefined") return "pt-BR";
  return document.documentElement.lang || "pt-BR";
}

function agoraIso(): string {
  return new Date().toISOString();
}

function gravarV2(estado: ConsentV2) {
  try {
    window.localStorage.setItem(LS_V2, JSON.stringify(estado));
  } catch {
    void 0; /* localStorage indisponível (privacy mode) */
  }
}

function gravarCookie(c: { analytics: boolean; monitoring: boolean }) {
  // Espelho SSR-compatível (v1) — consumers server-side/middleware leem o cookie.
  const record = {
    analytics: c.analytics,
    monitoring: c.monitoring,
    v: 2,
    ts: Math.floor(Date.now() / 1000),
    lang: typeof document !== "undefined" ? document.documentElement.lang || "pt-BR" : "pt-BR",
    country:
      typeof document !== "undefined"
        ? (document.documentElement.lang || "pt-BR").split("-")[1]?.toUpperCase() || "BR"
        : "BR",
  };
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(record))}; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

function removerCookie() {
  document.cookie = `${COOKIE}=; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Purga resíduos antigos: flag genérica v1 e cookies ph_* (D-425/T438). */
function limparResiduos() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_V1_GENERICO);
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

function espelharServerSide(c: { analytics: boolean; monitoring: boolean }) {
  // T470/D-531: espelho append-only no consent_logs (T442/T443) — apenas para
  // usuários autenticados (o endpoint exige req.user); fire-and-forget, sem
  // IP/PII no payload (país derivado do locale, nunca de geolocalização).
  void import("../lib/http")
    .then(({ api }) =>
      api.post("/api/v1/consent", {
        categorias: { analytics: c.analytics, monitoring: c.monitoring, necessary: true },
        versao: "v2-banner.2",
        ts: Date.now(),
        idioma: idiomaAtual(),
        pais: (idiomaAtual().split("-")[1] ?? "").toUpperCase() || "BR",
      }),
    )
    .catch(() => undefined);
}

const fontes = lerFontes();
const migracao = migrarConsentimento({
  v2Bruto: fontes.v2Bruto,
  v1Cookie: fontes.v1Cookie,
  lgpdV1: fontes.lgpdV1,
  idioma: idiomaAtual(),
  agoraIso: agoraIso(),
});

// D-425/T438 + D-531: purge da flag genérica antiga quando presente
// (NUNCA herdada como consentimento granular — reexibe o banner).
if (migracao.purgarLgpdV1) limparResiduos();
if (migracao.acao === "migrar-v1" && migracao.estado) gravarV2(migracao.estado);

interface EstadoStore {
  analytics: boolean;
  monitoring: boolean;
  decided: boolean;
  estadoV2: ConsentV2 | null;
}

const estadoInicial: EstadoStore = migracao.estado
  ? {
      analytics: migracao.estado.categorias.analytics,
      monitoring: migracao.estado.categorias.monitoring,
      decided: true,
      estadoV2: migracao.estado,
    }
  : { analytics: false, monitoring: false, decided: false, estadoV2: null };

export const useConsentStore = create<EstadoStore & {
  setConsent: (c: { analytics: boolean; monitoring: boolean }) => void;
  reset: () => void;
}>((set, get) => ({
  ...estadoInicial,

  setConsent: (c) => {
    const anterior = get().estadoV2;
    let estado = estadoV2De(c, anterior);
    // Trail de revogação: categoria que estava true e vira false.
    if (anterior) {
      const revogacoes = [...anterior.revogacoes];
      if (anterior.categorias.analytics && !c.analytics)
        revogacoes.push({ categoria: "analytics", timestamp: agoraIso() });
      if (anterior.categorias.monitoring && !c.monitoring)
        revogacoes.push({ categoria: "monitoring", timestamp: agoraIso() });
      estado = { ...estado, revogacoes };
    }
    gravarV2(estado);
    gravarCookie(c);
    if (!c.analytics) limparResiduos();
    espelharServerSide(c);
    set({ analytics: c.analytics, monitoring: c.monitoring, decided: true, estadoV2: estado });
  },

  reset: () => {
    // Revoga TUDO: trail registrado, cookie removido, banner reexibido.
    const atual = get().estadoV2;
    if (atual) {
      const revogado = registrarRevogacaoV2(atual, "analytics", agoraIso());
      const comMonitoring = registrarRevogacaoV2(revogado, "monitoring", agoraIso());
      gravarV2({ ...comMonitoring, timestamp_iso: agoraIso() });
    }
    removerCookie();
    limparResiduos();
    set({
      analytics: false,
      monitoring: false,
      decided: false,
      estadoV2: atual ? { ...atual, categorias: { analytics: false, monitoring: false } } : null,
    });
    espelharServerSide({ analytics: false, monitoring: false });
  },
}));

function estadoV2De(
  c: { analytics: boolean; monitoring: boolean },
  anterior: ConsentV2 | null,
): ConsentV2 {
  const base = anterior ?? {
    categorias: { analytics: false, monitoring: false },
    versao_banner: 2 as const,
    timestamp_iso: agoraIso(),
    idioma: idiomaAtual(),
    pais_sem_ip: (idiomaAtual().split("-")[1] ?? "").toUpperCase() || "BR",
    fornecedores: ["posthog", "sentry"] as string[],
    revogacoes: [] as { categoria: string; timestamp: string }[],
  };
  return { ...base, categorias: { ...c }, timestamp_iso: agoraIso() };
}
