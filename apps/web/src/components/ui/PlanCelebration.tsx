"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/use-auth-store";
import { ConfettiCelebration } from "./ConfettiCelebration";

const FLAG = "mediarate:celebration:v1";

/**
 * T389 (D-357) — assinantes existentes (Plus/Premium) veem o confete UMA vez
 * na primeira visita pós-deploy (flag localStorage). Não repete; respeita
 * prefers-reduced-motion via ConfettiCelebration.
 */
export function PlanCelebration() {
  const plan = useAuthStore((s) => s.user?.plan);
  const t = useTranslations("billing");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (plan !== "PLUS" && plan !== "PREMIUM") return;
    try {
      if (localStorage.getItem(FLAG)) return;
      localStorage.setItem(FLAG, "1");
      setShow(true);
      toast.success(t(plan === "PLUS" ? "successPlusTitle" : "successPremiumTitle"));
    } catch {
      // localStorage indisponível — segue sem confete, sem quebrar.
    }
  }, [plan, t]);

  if (!show) return null;
  return <ConfettiCelebration />;
}
