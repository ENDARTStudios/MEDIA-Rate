"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { useLocale, useTranslations } from "next-intl";
import { scoreColor as getScoreColor } from "@/lib/design-tokens";
import { escalaPorTipo, normalizeDisplayScore, formatarScoreLocale } from "@/lib/score-utils";

interface MediaScoreBadgeProps {
  score: number;
  mediaType?: string;
  className?: string;
}

export function MediaScoreBadge({ score, mediaType, className }: MediaScoreBadgeProps) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const isGame = mediaType === "game";
  const numRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // T147/B4: normaliza ANTES de exibir/colorir — valor cru da API pode estar
  // em 0-100; mangá/filme/série exibem 0-10 truncado (7,9), games 0-100.
  // Cor usa a escala nativa (getScoreColor espera valor na escala do tipo).
  const escala = escalaPorTipo(mediaType);
  const value = normalizeDisplayScore(score, mediaType);
  const color = getScoreColor(value, escala);

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
      numRef.current.textContent = formatarScoreLocale(value, locale);
      return;
    }

    const obj = { val: 0 };
    animate(obj, {
      val: value,
      duration: 1200,
      ease: "outExpo",
      onUpdate: () => {
        if (numRef.current) {
          // T147/B3: sem Math.round — formatação trunca em 1 casa e o frame
          // final (val === value) é idêntico ao reduced-motion.
          numRef.current.textContent = formatarScoreLocale(obj.val, locale);
        }
      },
    });
  }, [inView, value, locale]);

  return (
    <div
      ref={rootRef}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${className ?? ""}`}
      style={{
        backgroundColor: `${color}1A`,
        border: `1px solid ${color}4D`,
      }}
      aria-label={t(isGame ? "mediaScoreAria" : "mediaScoreAria10", {
        score: formatarScoreLocale(value, locale),
      })}
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
