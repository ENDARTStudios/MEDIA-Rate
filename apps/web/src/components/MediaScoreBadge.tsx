"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { useTranslations } from "next-intl";
import { colors, score } from "@/lib/design-tokens";

function scoreColor(value: number): string {
  if (value >= 70) return score.high;
  if (value >= 40) return score.medium;
  return score.low;
}

interface MediaScoreBadgeProps {
  score: number;
  className?: string;
}

export function MediaScoreBadge({ score: value, className }: MediaScoreBadgeProps) {
  const t = useTranslations("catalog");
  const numRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !numRef.current) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      numRef.current.textContent = String(value);
      return;
    }

    const obj = { val: 0 };
    animate(obj, {
      val: value,
      duration: 1200,
      ease: "outExpo",
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.textContent = String(Math.round(obj.val));
        }
      },
    });
  }, [inView, value]);

  const color = scoreColor(value);

  return (
    <div
      ref={rootRef}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${className ?? ""}`}
      style={{
        backgroundColor: `${color}1A`,
        border: `1px solid ${color}4D`,
      }}
      aria-label={t("mediaScoreAria", { score: value })}
      role="status"
    >
      <span
        ref={numRef}
        className="font-heading text-sm font-bold tabular-nums"
        style={{ color }}
      >
        0
      </span>
      <span className="text-xs text-gray-400" aria-hidden="true">
        MEDIA Score&trade;
      </span>
    </div>
  );
}
