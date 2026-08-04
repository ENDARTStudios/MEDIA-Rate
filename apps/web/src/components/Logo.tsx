"use client";

import { useEffect, useRef, useId } from "react";
import { animate } from "animejs";

const SIZES = {
  sm: { symbol: "h-7 w-7", media: "text-sm", rate: "text-xs", gap: "gap-1.5" },
  md: { symbol: "h-9 w-9", media: "text-lg", rate: "text-[0.8125rem]", gap: "gap-2.5" },
  lg: { symbol: "h-12 w-12", media: "text-2xl", rate: "text-base", gap: "gap-3" },
} as const;

interface LogoProps {
  variant?: "full" | "compact" | "inline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ variant = "full", size = "md", className }: LogoProps) {
  const filterId = useId().replace(/:/g, "");
  const diamondRef = useRef<SVGPathElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const diamond = diamondRef.current;
    const ring = ringRef.current;

    if (diamond) {
      const len = diamond.getTotalLength();
      diamond.style.strokeDasharray = String(len);
      diamond.style.strokeDashoffset = String(len);
      animate(diamond, {
        strokeDashoffset: [len, 0],
        duration: 700,
        ease: "outCubic",
      });
    }

    if (ring) {
      const circumference = ring.getTotalLength();
      ring.style.strokeDasharray = String(circumference);
      ring.style.strokeDashoffset = String(circumference);
      animate(ring, {
        strokeDashoffset: [circumference, circumference * 0.25],
        duration: 600,
        delay: 180,
        ease: "outCubic",
      });
    }

    if (dotRef.current) {
      animate(dotRef.current, {
        opacity: [0, 0.9],
        duration: 400,
        delay: 550,
        ease: "outCubic",
      });
    }
  }, []);

  const s = SIZES[size];

  return (
    <span className={`inline-flex items-center select-none ${variant === "full" ? s.gap : ""}`}>
      <svg
        viewBox="0 0 40 40"
        className={`${s.symbol} ${className ?? ""} shrink-0`}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={`logo-neon-${filterId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          ref={diamondRef}
          d="M20 3L37 20L20 37L3 20Z"
          stroke="#818CF8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#logo-neon-${filterId})`}
        />

        <circle
          ref={ringRef}
          cx="20"
          cy="20"
          r="6.5"
          stroke="#818CF8"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform="rotate(40 20 20)"
          opacity="0.85"
        />

        <circle ref={dotRef} cx="20" cy="20" r="1.5" fill="#818CF8" opacity="0" />
      </svg>

      {variant === "full" && (
        <span className="flex flex-col items-start leading-tight">
          <span
            className={`font-heading font-bold text-[#F5F5F7] leading-none tracking-tight ${s.media}`}
          >
            MEDIA
          </span>
          <span
            className={`font-heading font-medium text-[#A0A0B8] leading-none tracking-wider ${s.rate}`}
          >
            Rate
          </span>
        </span>
      )}

      {/* Variante inline: "MEDIA Rate" com espaço (fix do diagnóstico do header). */}
      {variant === "inline" && (
        <span
          className={`font-heading font-bold text-[#F5F5F7] leading-none tracking-tight ${s.media}`}
        >
          MEDIA <span className="font-medium text-[#A0A0B8]">Rate</span>
        </span>
      )}
    </span>
  );
}
