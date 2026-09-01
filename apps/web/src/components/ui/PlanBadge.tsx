"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * T362 (D-336) — badge do plano no avatar do usuário, visível sem entrar no
 * Perfil. Nomes de plano são próprios (não traduzidos); aria-label localizado.
 */
const PLAN_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  FREE: { color: "#05050A", bg: "#80809B", label: "Free" },
  PLUS: { color: "#05050A", bg: "#E11D48", label: "Plus" },
  PREMIUM: { color: "#05050A", bg: "#D4AF37", label: "Premium" },
};

export function PlanBadge({ plan, className }: { plan?: string; className?: string }) {
  const t = useTranslations("nav");
  if (!plan) return null;
  const config = PLAN_CONFIG[plan] ?? PLAN_CONFIG.FREE;

  return (
    <span
      className={cn(
        "pointer-events-none absolute -bottom-1 -right-1 rounded-full border-2 border-[#09090F] px-1 py-0.5 text-xs font-bold leading-none",
        className,
      )}
      style={{ backgroundColor: config.bg, color: config.color }}
      aria-label={t("planBadgeAria", { plano: config.label })}
    >
      {config.label}
    </span>
  );
}
