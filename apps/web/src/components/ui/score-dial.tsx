"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { scoreColor } from "@/lib/design-tokens";

interface ScoreDialProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showBreakdown?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { viewBox: 64, center: 32, radius: 26, strokeWidth: 4 },
  md: { viewBox: 96, center: 48, radius: 42, strokeWidth: 5 },
  lg: { viewBox: 136, center: 68, radius: 60, strokeWidth: 6 },
} as const;

const BREAKDOWN_BARS = [
  { label: "Crítica", pct: 40, color: "#38BDF8" },
  { label: "Público", pct: 40, color: "#F59E0B" },
  { label: "Consenso", pct: 20, color: "#818CF8" },
] as const;

export function ScoreDial({
  score,
  size = "md",
  showBreakdown = false,
  className,
}: ScoreDialProps) {
  const config = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * config.radius;
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const clamped = Math.max(0, Math.min(10, score));
  const color = scoreColor(clamped);
  const fillOffset = circumference - (clamped / 10) * circumference;
  const displayOffset = inView ? fillOffset : circumference;

  const ringEl = (
    <div className="relative" style={{ width: config.viewBox, height: config.viewBox }}>
      <svg
        className="h-full w-full -rotate-90"
        viewBox={`0 0 ${config.viewBox} ${config.viewBox}`}
        aria-hidden="true"
      >
        <defs>
          <filter id={`glow-${size}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={config.center}
          cy={config.center}
          r={config.radius}
          fill="none"
          stroke="#1C1C2E"
          strokeWidth={config.strokeWidth}
        />
        <circle
          cx={config.center}
          cy={config.center}
          r={config.radius}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={displayOffset}
          filter={`url(#glow-${size})`}
          style={{
            transition: inView ? "stroke-dashoffset 800ms ease-out" : "none",
          }}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-heading font-bold tabular-nums",
          size === "sm" && "text-score-sm",
          size === "md" && "text-score-md",
          size === "lg" && "text-score-lg",
        )}
        style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {clamped}
      </span>
    </div>
  );

  const breakdownEl = (
    <div
      className={cn(
        "space-y-1.5",
        !showBreakdown &&
          "absolute top-full left-1/2 -translate-x-1/2 z-tooltip mt-2 rounded-md p-3 shadow-surface-3 min-w-[180px]",
        !showBreakdown && "bg-[#11111E] border border-[rgba(129,140,248,0.12)]",
      )}
    >
      {BREAKDOWN_BARS.map((bar) => (
        <div key={bar.label} className="flex items-center gap-2 text-xs">
          <span
            className="w-16 shrink-0 font-body"
            style={{ color: "#EDE7DC", fontFamily: "'Inter', sans-serif" }}
          >
            {bar.label}
          </span>
          <div className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: "#1C1C2E" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${bar.pct}%`,
                backgroundColor: bar.color,
                transition: "width 600ms ease-out",
              }}
            />
          </div>
          <span
            className="w-8 shrink-0 text-right tabular-nums font-body"
            style={{ color: "#9CA3AF", fontFamily: "'Inter', sans-serif" }}
          >
            {bar.pct}%
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-flex flex-col items-center", className)}
      onMouseEnter={() => !showBreakdown && setHovered(true)}
      onMouseLeave={() => !showBreakdown && setHovered(false)}
      aria-label={`Score: ${clamped} out of 10`}
      role="status"
    >
      {ringEl}
      {showBreakdown && <div className="mt-3 w-full">{breakdownEl}</div>}
      {!showBreakdown && hovered && breakdownEl}
    </div>
  );
}
