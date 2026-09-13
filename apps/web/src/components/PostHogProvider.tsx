"use client";

/**
 * PostHog no frontend (item 7 do PENDENCIAS — etapa web).
 *
 * - Inerte sem NEXT_PUBLIC_ANALYTICS_WRITE_KEY.
 * - D-383: posthog-js é carregado por import dinâmico (idle) — o SDK
 *   (~93KiB: recorder + surveys) sai do bundle inicial da home.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/use-auth-store";
import { useConsentStore } from "@/stores/use-consent-store";

/** Subconjunto mínimo da API de posthog-js usado aqui (evita import() type). */
interface PostHogInstance {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  __loaded?: boolean;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  // T432 (D-422): analytics só carrega com consentimento do usuário.
  const analyticsConsent = useConsentStore((s) => s.analytics);
  const enabled = Boolean(process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY) && analyticsConsent;
  const posthogRef = useRef<PostHogInstance | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const { default: posthog } = await import("posthog-js");
      if (cancelled) return;
      posthogRef.current = posthog;
      posthog.init(process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY as string, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
        capture_pageview: false,
        capture_pageleave: false,
      });
      posthog.capture("$pageview", { path: window.location.pathname });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    const posthog = posthogRef.current;
    if (!enabled || !posthog || !posthog.__loaded) return;
    posthog.capture("$pageview", { path: pathname });
  }, [pathname, enabled]);

  useEffect(() => {
    const posthog = posthogRef.current;
    if (!enabled || !user?.id || !posthog || !posthog.__loaded) return;
    // T452: sem PII no PostHog — apenas id (distinct_id) + plano. Email e nome
    // NÃO são enviados (reduz exposição; Política de Privacidade atualizada).
    posthog.identify(user.id, {
      plan: user.plan,
    });
  }, [enabled, user]);

  return <>{children}</>;
}
