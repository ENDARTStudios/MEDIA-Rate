"use client";

/**
 * T452 — PostHog no frontend: feature flags (rollout gradual) + eventos de
 * funil. Respeita o consentimento de analytics (T432): sem consentimento o
 * PostHog não é carregado e estas funções são no-op (fallback seguro).
 *
 * Flags conhecidas:
 * - `cloudflare_migration`: decide CDN/endpoint (Vercel vs Cloudflare) durante
 *   a transição. Default OFF → comportamento atual (Vercel) preservado.
 */

export const FEATURE_FLAGS = {
  CLOUDFLARE_MIGRATION: "cloudflare_migration",
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

/** Subconjunto mínimo da API do posthog-js usado por este helper. */
export interface PostHogLike {
  isFeatureEnabled?: (flag: string) => boolean | undefined;
  getFeatureFlag?: (flag: string) => boolean | string | undefined;
  capture?: (event: string, props?: Record<string, unknown>) => void;
}

/**
 * Avalia uma flag booleana com fallback seguro. Nunca lança: qualquer erro ou
 * ausência do SDK devolve o fallback (default OFF → não muda comportamento).
 */
export function flagAtiva(
  posthog: PostHogLike | null | undefined,
  flag: FeatureFlag,
  fallback = false,
): boolean {
  if (!posthog) return fallback;
  try {
    if (typeof posthog.isFeatureEnabled === "function") {
      const v = posthog.isFeatureEnabled(flag);
      if (typeof v === "boolean") return v;
    }
    if (typeof posthog.getFeatureFlag === "function") {
      const v = posthog.getFeatureFlag(flag);
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v !== "false" && v !== "";
    }
  } catch {
    return fallback;
  }
  return fallback;
}

/** Captura um evento de funil; no-op sem PostHog. Nunca quebra a UI. */
export function capturarEvento(
  posthog: PostHogLike | null | undefined,
  event: string,
  props?: Record<string, unknown>,
): void {
  if (!posthog?.capture) return;
  try {
    posthog.capture(event, props);
  } catch {
    void 0; /* analytics nunca quebra a UI */
  }
}
