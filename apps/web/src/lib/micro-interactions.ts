"use client";

import { animate } from "animejs";
import { useCallback, type MouseEvent } from "react";

export function useRipple() {
  return useCallback((e: MouseEvent<HTMLElement>) => {
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
}

export function useHapticHeart() {
  return useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    animate(el, {
      scale: [1, 1.25, 0.9, 1.05, 1],
      duration: 600,
      ease: "outElastic(1, 0.4)",
    });
  }, []);
}

export function useHapticBookmark() {
  return useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    animate(el, {
      y: [0, -4, 2, 0],
      duration: 500,
      ease: "outBounce",
    });
  }, []);
}

export function useHapticConfirm() {
  return useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const check = document.createElement("span");
    check.textContent = "✓";
    check.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#22C55E;font-size:1.5em;font-weight:bold;opacity:0;`;
    el.style.position = el.style.position || "relative";
    el.appendChild(check);

    animate([el, check], {
      duration: 800,
      autoplay: true,
    });

    animate(el, { scale: [1, 1.15, 1], duration: 400, ease: "outBack" });
    setTimeout(() => check.remove(), 900);
  }, []);
}
