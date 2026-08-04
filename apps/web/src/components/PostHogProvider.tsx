"use client";

/**
 * PostHog no frontend (item 7 do PENDENCIAS — etapa web).
 *
 * - Inerte sem NEXT_PUBLIC_ANALYTICS_WRITE_KEY (variável do Vercel ainda não
 *   configurada — adicionar quando o Operador setar as vars no painel).
 * - Captura pageview por rota (não usa capture_pageview automático para
 *   respeitar o App Router) e identifica o usuário logado.
 */
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useAuthStore } from "@/stores/use-auth-store";

export function PostHogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const enabled = Boolean(process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY);

  useEffect(() => {
    if (!enabled) return;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
    posthog.init(process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY as string, {
      api_host: host,
      capture_pageview: false,
      capture_pageleave: false,
    });
    posthog.capture("$pageview", { path: window.location.pathname });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !posthog.__loaded) return;
    posthog.capture("$pageview", { path: pathname });
  }, [pathname, enabled]);

  useEffect(() => {
    if (!enabled || !user?.id || !posthog.__loaded) return;
    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
      plan: user.plan,
    });
  }, [enabled, user]);

  return <>{children}</>;
}
