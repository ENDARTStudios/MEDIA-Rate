"use client";

import { useEffect, useState } from "react";

/**
 * T351 — preferência de movimento (Motion Principles, D-318).
 *
 * Retorna o nível de animação permitido:
 * - "full": animações completas (default).
 * - "reduced": `prefers-reduced-motion: reduce` → fade curto (100ms), sem
 *   deslocamento/transform em escala.
 * - "none": override explícito do usuário (localStorage `mediarate:motion=none`)
 *   → apenas transição de estado, zero animação.
 *
 * A leitura é lazy (client-only) e reativa à mudança da media query.
 */
export type MotionPref = "full" | "reduced" | "none";

const STORAGE_KEY = "mediarate:motion";

function readPref(): MotionPref {
  if (typeof window === "undefined") return "full";
  try {
    const override = localStorage.getItem(STORAGE_KEY);
    if (override === "none" || override === "reduced" || override === "full") {
      return override;
    }
  } catch {
    /* localStorage indisponível (privado) — ignora */
  }
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
  }
  return "full";
}

export function useMotionPref(): MotionPref {
  const [pref, setPref] = useState<MotionPref>("full");

  useEffect(() => {
    setPref(readPref());
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPref(readPref());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return pref;
}
