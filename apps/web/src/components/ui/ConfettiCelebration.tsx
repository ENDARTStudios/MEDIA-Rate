"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  vr: number;
}

const COLORS = ["#E11D48", "#D4AF37", "#F5F5F7", "#38BDF8", "#818CF8"];

/**
 * T363 (D-336) — confete de felicitações pós-compra (canvas, sem lib pesada).
 * - Dura ~3s, rAF, não bloqueia a página.
 * - prefers-reduced-motion → não renderiza (acessibilidade).
 */
export function ConfettiCelebration({ duration = 3000 }: { duration?: number }) {
  const shouldReduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (shouldReduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.3,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      w: 6 + Math.random() * 5,
      h: 10 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
    }));

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        if (p.y > canvas.height + 20) p.y = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [shouldReduce, duration]);

  if (shouldReduce) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-toast"
      aria-hidden="true"
    />
  );
}
