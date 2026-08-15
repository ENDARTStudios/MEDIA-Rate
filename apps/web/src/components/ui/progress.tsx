"use client";

import { Spinner } from "./spinner";
import { cn } from "@/lib/utils";

interface ProgressProps {
  label?: string;
  className?: string;
}

/**
 * T351 — indicador de progresso NÃO-bloqueante para conteúdo assíncrono.
 * Spinner discreto + rótulo opcional; nunca bloqueia a interação.
 */
export function Progress({ label, className }: ProgressProps) {
  return (
    <div className={cn("flex items-center gap-2 text-[#6B7280]", className)} aria-live="polite">
      <Spinner size="sm" />
      {label ? <span className="text-xs">{label}</span> : null}
    </div>
  );
}
