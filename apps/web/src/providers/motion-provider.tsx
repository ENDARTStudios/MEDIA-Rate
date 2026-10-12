"use client";

import { MotionConfig } from "motion/react";

/**
 * T208/D-580 — configuração GLOBAL do Motion (antes ausente no repo).
 *
 * `reducedMotion="user"`: quando o SO pede menos movimento, o Motion deixa de
 * animar `transform`/`layout` e mantém apenas opacidade/cor — exatamente a
 * política do projeto (`prefers-reduced-motion` obrigatório em todo componente).
 * Componentes que já checam `useReducedMotion()`/`useReducedMotionPref()`
 * continuam funcionando: esta é uma segunda linha de defesa, aplicada a TODOS os
 * `motion.*` do app, inclusive os que não fazem o gate manualmente.
 *
 * Ref.: https://motion.dev/docs/react-motion-config
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
