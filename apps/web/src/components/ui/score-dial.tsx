"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { scoreColor } from "@/lib/design-tokens";

interface ScoreDialProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showBreakdown?: boolean;
  className?: string;
  scale?: "0-10" | "0-100";
  breakdownData?: { critic: number; audience: number; consensus: number };
  sources?: { source: string; score: number; maxScore: number }[];
}

const SIZE_CONFIG = {
  sm: { viewBox: 64, center: 32, radius: 26, strokeWidth: 4 },
  md: { viewBox: 96, center: 48, radius: 42, strokeWidth: 5 },
  lg: { viewBox: 136, center: 68, radius: 60, strokeWidth: 6 },
} as const;

const STATIC_BAR_PCTS = [40, 40, 20] as const;
const STATIC_BAR_COLORS = ["#38BDF8", "#F59E0B", "#818CF8"] as const;

export function ScoreDial({
  score,
  size = "md",
  showBreakdown = false,
  className,
  scale = "0-10",
  breakdownData,
  sources,
}: ScoreDialProps) {
  const tScore = useTranslations("scoredial");
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

  const clamped = Math.max(0, scale === "0-100" ? Math.min(100, score) : Math.min(10, score));
  const color = scoreColor(clamped, scale);
  const ringPercent = scale === "0-100" ? clamped / 100 : clamped / 10;
  const fillOffset = circumference - ringPercent * circumference;
  const displayOffset = inView ? fillOffset : circumference;
  const displayValue = scale === "0-100" ? Math.round(clamped) : Math.round(clamped * 10) / 10;

  const staticBars = [
    { label: tScore("critic"), pct: STATIC_BAR_PCTS[0], color: STATIC_BAR_COLORS[0] },
    { label: tScore("audience"), pct: STATIC_BAR_PCTS[1], color: STATIC_BAR_COLORS[1] },
    { label: tScore("consensus"), pct: STATIC_BAR_PCTS[2], color: STATIC_BAR_COLORS[2] },
  ];

  const bars = breakdownData
    ? [
        { label: tScore("critic"), pct: breakdownData.critic, color: "#38BDF8" },
        { label: tScore("audience"), pct: breakdownData.audience, color: "#F59E0B" },
        { label: tScore("consensus"), pct: breakdownData.consensus, color: "#818CF8" },
      ]
    : staticBars;

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
        {scale === "0-100" ? Math.round(clamped) : displayValue}
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
      {bars.map((bar) => (
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
      aria-label={tScore("ariaLabel", {
        score: displayValue,
        max: scale === "0-100" ? "100" : "10",
      })}
      role="status"
    >
      {ringEl}
      {showBreakdown && <div className="mt-3 w-full">{breakdownEl}</div>}
      {!showBreakdown && hovered && breakdownEl}
    </div>
  );
}
