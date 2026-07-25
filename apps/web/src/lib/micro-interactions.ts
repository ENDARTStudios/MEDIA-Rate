"use client";

import { animate } from "animejs";
import { useCallback, type MouseEvent } from "react";

export function useRipple() {
  const createRipple = useCallback((e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement("span");
    ripple.style.cssText = `position:absolute;border-radius:50%;width:${size}px;height:${size}px;left:${x}px;top:${y}px;pointer-events:none;background:rgba(255,255,255,0.12);transform:scale(0);z-index:0;`;
    el.style.position = el.style.position || "relative";
    el.style.overflow = "hidden";
    el.appendChild(ripple);

    animate(ripple, {
      scale: [0, 1],
      opacity: [0.35, 0],
      duration: 650,
      ease: "outCubic",
      onComplete: () => ripple.remove(),
    });
  }, []);

  return createRipple;
}
