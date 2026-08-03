"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { useTranslations } from "next-intl";
import { scoreColor as getScoreColor } from "@/lib/design-tokens";

function scoreHex(value: number): string {
  const normalized = value / 10;
  return getScoreColor(normalized);
}

interface MediaScoreBadgeProps {
  score: number;
  mediaType?: string;
  className?: string;
}

export function MediaScoreBadge({ score: value, mediaType, className }: MediaScoreBadgeProps) {
  const t = useTranslations("catalog");
  const isGame = mediaType === "game";
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
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !numRef.current) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  const color = scoreHex(value);

  return (
    <div
      ref={rootRef}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${className ?? ""}`}
      style={{
        backgroundColor: `${color}1A`,
        border: `1px solid ${color}4D`,
      }}
      aria-label={t(isGame ? "mediaScoreAria" : "mediaScoreAria10", { score: value })}
      role="status"
    >
      <span ref={numRef} className="font-heading text-sm font-bold tabular-nums" style={{ color }}>
        0
      </span>
      <span className="text-xs text-gray-400" aria-hidden="true">
        MEDIA Score&trade;
      </span>
    </div>
  );
}
