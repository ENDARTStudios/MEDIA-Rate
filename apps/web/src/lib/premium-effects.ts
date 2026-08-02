"use client";

import { useEffect, useRef, useCallback } from "react";

interface CursorOptions {
  glowSize?: number;
  glowColor?: string;
  magneticStrength?: number;
}

export function useCinematicCursor({
  glowSize = 300,
  glowColor = "rgba(225, 29, 72, 0.06)",
  magneticStrength = 0.15,
}: CursorOptions = {}) {
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const glow = document.createElement("div");
    glow.style.cssText = `position:fixed;pointer-events:none;z-index:9999;width:${glowSize}px;height:${glowSize}px;border-radius:50%;background:radial-gradient(circle,${glowColor},transparent 70%);transform:translate(-50%,-50%);transition:opacity 0.3s;opacity:0;`;
    document.body.appendChild(glow);
    glowRef.current = glow;

    let x = -1000;
    let y = -1000;
    let tx = x;
    let ty = y;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      glow.style.opacity = "1";
    };

    const onLeave = () => {
      glow.style.opacity = "0";
    };

    const loop = () => {
      x += (tx - x) * 0.1;
      y += (ty - y) * 0.1;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${x - glowSize / 2}px, ${y - glowSize / 2}px)`;
      }
      requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    const raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      glow.remove();
      glowRef.current = null;
    };
  }, [glowSize, glowColor]);

  const magneticRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      const onEnter = () => (el.style.transition = "transform 0.15s ease-out");
      const onMove = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) * magneticStrength;
        const dy = (e.clientY - cy) * magneticStrength;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      };
      const onLeave = () => {
        el.style.transform = "translate(0, 0)";
      };

      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointermove", onMove as EventListener);
      el.addEventListener("pointerleave", onLeave);

      return () => {
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointermove", onMove as EventListener);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    [magneticStrength],
  );

  return { magneticRef };
}

export function useAdaptiveMotion() {
  if (typeof window === "undefined") return { scale: 1, duration: 1 };

  const w = window.innerWidth;
  if (w >= 1440) return { scale: 1, duration: 1 };
  if (w >= 1024) return { scale: 0.8, duration: 0.7 };
  if (w >= 768) return { scale: 0.5, duration: 0.4 };
  return { scale: 0.2, duration: 0.2 };
}

export function useProgressiveImage(src: string | null | undefined) {
  if (!src) return { currentSrc: null, loaded: true };

  const currentSrc = src;
  const loaded = true;

  return { currentSrc, loaded };
}
