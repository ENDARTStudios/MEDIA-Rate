/**
 * T470 (D-531/D-532) — migração e schema v2 do consentimento granular.
 *
 * Fontes de verdade (em ordem de precedência):
 *  1. `mr_consent_v2` (localStorage) — schema granular versionado
 *  2. cookie `mr_consent` v1 (T442/T443) — migra-se PRESERVANDO categorias
 *  3. `lgpd-consent-v1` (genérico "accepted") — NUNCA herdado como granular:
 *     purge + banner reexibido (achado P0 da auditoria/parecer)
 *  4. nada → privacy by default (banner reexibido)
 *
 * A função é PURA: recebe o estado bruto das fontes e devolve o estado
 * derivado + a ação a executar (sem tocar storage — o store orquestra).
 */

export interface ConsentV2 {
  categorias: { analytics: boolean; monitoring: boolean };
  versao_banner: 2;
  timestamp_iso: string;
  idioma: string;
  /** Derivado do locale (ex.: "pt-BR" → "BR"). NUNCA de geolocalização/IP. */
  pais_sem_ip: string;
  fornecedores: string[];
  revogacoes: { categoria: string; timestamp: string }[];
}

export type AcaoMigracao = "usar-v2" | "migrar-v1" | "reexibir-banner" | "purgar-v1";

export interface ResultadoMigracao {
  estado: ConsentV2 | null;
  acao: AcaoMigracao;
  /** Flag genérica antiga a purgar do localStorage. */
  purgarLgpdV1: boolean;
}

const FORNECEDORES = ["posthog", "sentry"] as const;

function categoriasValidas(v: unknown): v is { analytics: boolean; monitoring: boolean } {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.analytics === "boolean" && typeof o.monitoring === "boolean";
}

function estadoV2DeCategorias(
  categorias: { analytics: boolean; monitoring: boolean },
  agoraIso: string,
  idioma: string,
): ConsentV2 {
  return {
    categorias,
    versao_banner: 2,
    timestamp_iso: agoraIso,
    idioma,
    pais_sem_ip: (idioma.split("-")[1] ?? "").toUpperCase() || "BR",
    fornecedores: [...FORNECEDORES],
    revogacoes: [],
  };
}

export function migrarConsentimento(input: {
  v2Bruto: unknown;
  v1Cookie: { analytics: boolean; monitoring: boolean } | null;
  lgpdV1: string | null;
  idioma: string;
  agoraIso: string;
}): ResultadoMigracao {
  // 1. v2 válido → usa (com validação estrutural estrita)
  if (v2Valido(input.v2Bruto)) {
    return { estado: input.v2Bruto as ConsentV2, acao: "usar-v2", purgarLgpdV1: false };
  }

  // 2. cookie v1 granular (T442/T443) → migra preservando categorias
  if (input.v1Cookie) {
    return {
      estado: estadoV2DeCategorias(input.v1Cookie, input.agoraIso, input.idioma),
      acao: "migrar-v1",
      purgarLgpdV1: false,
    };
  }

  // 3. flag genérica lgpd-consent-v1 ("accepted") — NUNCA herdada como
  //    granular: purge + banner reexibido (achado P0 auditoria/parecer).
  if (input.lgpdV1) {
    return { estado: null, acao: "reexibir-banner", purgarLgpdV1: true };
  }

  // 4. nada → privacy by default
  return { estado: null, acao: "reexibir-banner", purgarLgpdV1: false };
}

function v2Valido(v: unknown): v is ConsentV2 {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const cat = o.categorias;
  if (!categoriasValidas(cat)) return false;
  if (o.versao_banner !== 2) return false;
  if (typeof o.timestamp_iso !== "string" || o.timestamp_iso === "") return false;
  if (typeof o.idioma !== "string" || o.idioma === "") return false;
  if (typeof o.pais_sem_ip !== "string" || o.pais_sem_ip === "") return false;
  if (!Array.isArray(o.fornecedores)) return false;
  if (!Array.isArray(o.revogacoes)) return false;
  for (const r of o.revogacoes) {
    if (typeof r !== "object" || r === null) return false;
    const rr = r as Record<string, unknown>;
    if (typeof rr.categoria !== "string" || typeof rr.timestamp !== "string") return false;
  }
  return true;
}

/** Registro de revogação por categoria (append no array do estado v2). */
export function registrarRevogacaoV2(
  estado: ConsentV2,
  categoria: "analytics" | "monitoring",
  agoraIso: string,
): ConsentV2 {
  return {
    ...estado,
    categorias: { ...estado.categorias, [categoria]: false },
    revogacoes: [...estado.revogacoes, { categoria, timestamp: agoraIso }],
  };
}
