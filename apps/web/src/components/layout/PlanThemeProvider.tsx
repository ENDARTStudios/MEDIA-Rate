"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/use-auth-store";

const PLAN_ACCENT: Record<string, string> = {
  FREE: "#818CF8", // indigo neutro
  PLUS: "#E11D48", // rose
  PREMIUM: "#D4AF37", // gold
};

/**
 * T388 (D-357) — identidade de cor por plano no shell logado.
 * Seta a variável CSS --plan-accent (e --plan-accent-soft) na raiz, usada
 * por botões primários, anéis de foco e glows do plano do usuário.
 */
export function PlanThemeProvider({ children }: { children?: React.ReactNode }) {
  const plan = useAuthStore((s) => s.user?.plan);

  useEffect(() => {
    const accent = PLAN_ACCENT[plan ?? "FREE"] ?? PLAN_ACCENT.FREE;
    const root = document.documentElement;
    root.style.setProperty("--plan-accent", accent);
    root.style.setProperty("--plan-accent-soft", `${accent}22`);
    return () => {
      root.style.removeProperty("--plan-accent");
      root.style.removeProperty("--plan-accent-soft");
    };
  }, [plan]);

  return <>{children}</>;
}
