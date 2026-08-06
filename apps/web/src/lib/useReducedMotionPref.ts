"use client";

import { useReducedMotion as useMotionReduced } from "motion/react";

/**
 * Hook compartilhado de prefers-reduced-motion (Parte 5, D-203).
 * SSR-safe: retorna false no servidor (sem animação até hidratar) e o valor
 * real no cliente. TODO componente animado deve passar por aqui.
 */
export function useReducedMotionPref(): boolean {
  return useMotionReduced() ?? false;
}
