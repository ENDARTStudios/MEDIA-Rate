"use client";

import { useReducedMotion as useMotionReduced } from "motion/react";

export function useReducedMotion(): boolean {
  return useMotionReduced() ?? false;
}
