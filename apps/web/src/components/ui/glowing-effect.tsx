"use client";

import { useEffect, useRef, useCallback } from "react";

interface GlowingEffectProps {
  spread?: number;
  glow?: boolean;
  disabled?: boolean;
  proximity?: number;
  inactiveZone?: number;
  borderWidth?: number;
}

export function GlowingEffect({
  spread = 40,
  glow = true,
  disabled = false,
  proximity = 64,
  inactiveZone = 0.01,
  borderWidth = 2,
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const mouseRef = useRef({ x: 9999, y: 9999 });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const { x: mx, y: my } = mouseRef.current;
    const cx = mx - rect.left;
    const cy = my - rect.top;

    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!glow || disabled) return;

    const inside = cx >= inactiveZone && cx <= rect.width - inactiveZone && cy >= inactiveZone && cy <= rect.height - inactiveZone;
    if (!inside) return;

    const dx = Math.min(Math.abs(cx), Math.abs(rect.width - cx));
    const dy = Math.min(Math.abs(cy), Math.abs(rect.height - cy));
    const dist = Math.min(dx, dy);
    const intensity = Math.max(0, 1 - dist / proximity);

    if (intensity <= 0) return;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
    gradient.addColorStop(0, `rgba(225, 29, 72, ${0.15 * intensity})`);
    gradient.addColorStop(0.5, `rgba(225, 29, 72, ${0.08 * intensity})`);
    gradient.addColorStop(1, "rgba(225, 29, 72, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const borderGradient = ctx.createRadialGradient(cx, cy, spread * 0.8, cx, cy, spread);
    borderGradient.addColorStop(0, `rgba(225, 29, 72, ${0.6 * intensity})`);
    borderGradient.addColorStop(1, "rgba(225, 29, 72, 0)");

    const r = spread * intensity;
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(borderWidth / 2, borderWidth / 2, rect.width - borderWidth, rect.height - borderWidth, 20);
    ctx.stroke();
  }, [spread, glow, disabled, proximity, inactiveZone, borderWidth]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const loop = () => {
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
    };
  }, [render]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
