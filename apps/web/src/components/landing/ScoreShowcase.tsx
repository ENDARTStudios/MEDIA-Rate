"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ScoreRing } from "./ScoreRing";
import type { MediaType } from "@/lib/types";
import { colors } from "@/lib/design-tokens";

export interface ShowcaseItem {
  title: string;
  posterUrl: string | null;
  type: MediaType;
  /** Consolidado 0-100 (fonte da API). */
  score: number;
  scale: "0-10" | "0-100";
  critics: number | null;
  audience: number | null;
  sources: string[];
  typeLabel: string;
}

const SOURCE_LABEL: Record<string, string> = {
  imdb: "IMDb",
  imdb_dataset: "IMDb",
  tmdb: "TMDB",
  rottentomatoes: "Rotten Tomatoes",
  rottentomatoes_audience: "RT",
  metacritic: "Metacritic",
  metacritic_user: "Metacritic",
  tvmaze: "TVMaze",
  trakt: "Trakt",
  letterboxd: "Letterboxd",
  igdb: "IGDB",
  igdb_publico: "IGDB",
  steam: "Steam",
  opencritic: "OpenCritic",
  openlibrary: "OpenLibrary",
  googlebooks: "Google Books",
  goodreads: "Goodreads",
  jikan: "Jikan",
  anilist: "AniList",
  kitsu: "Kitsu",
  comicvine: "ComicVine",
  comicbookroundup: "CBR",
};

function sourceLabel(s: string): string {
  return SOURCE_LABEL[s] ?? s.toUpperCase();
}

interface ScoreShowcaseProps {
  items: ShowcaseItem[];
}

/**
 * T358 (D-333) — showcase vivo do MEDIA Score: deck rotativo de 3 mídias reais
 * (filme/série/game) com anel animado + breakdown crítica vs público + fontes.
 * - Rotação ~4s, crossfade, pausa em hover/focus.
 * - Decorativo (aria-hidden no carrossel); acessível via o H1/sub à esquerda.
 */
export function ScoreShowcase({ items }: ScoreShowcaseProps) {
  const shouldReduce = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (shouldReduce || paused || items.length < 2) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % items.length), 4000);
    return () => clearInterval(timer);
  }, [shouldReduce, paused, items.length]);

  if (items.length === 0) return null;

  const item = items[current];

  return (
    <div
      className="relative w-full max-w-[360px]"
      data-testid="score-showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-hidden="true"
    >
      {/* Glow atrás do card */}
      <div className="absolute -inset-6 rounded-[28px] bg-[#E11D48] opacity-[0.10] blur-[60px]" />

      <AnimatePresence mode="wait">
        <motion.article
          key={item.title}
          className="relative overflow-hidden rounded-2xl border border-[rgba(129,140,248,0.14)] bg-[#12121C] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          initial={shouldReduce ? false : { opacity: 0, scale: 0.96, rotate: -1 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={shouldReduce ? undefined : { opacity: 0, scale: 0.98, rotate: 1 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            {item.posterUrl ? (
              <Image
                src={item.posterUrl}
                alt=""
                fill
                priority={current === 0}
                // T405: sizes explícito + fetchPriority alto — o pôster é o LCP
                // da home; sem isso o browser escolhia o srcset maior (3840w).
                sizes="(max-width: 1023px) 80vw, 360px"
                fetchPriority={current === 0 ? "high" : "auto"}
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#1B1B2C] to-[#0B0B1E]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#12121C] via-transparent to-transparent" />
          </div>

          {/* Anel + tipo sobre o poster */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-widest"
              style={{
                backgroundColor: "rgba(5,5,10,0.7)",
                color: colors.media[item.type],
                backdropFilter: "blur(4px)",
              }}
            >
              {item.typeLabel}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-heading text-lg font-bold text-[#F5F5F7]">
                {item.title}
              </h3>

              {/* Breakdown crítica vs público */}
              <div className="mt-3 space-y-1.5">
                <BreakdownBar label="Crítica" pct={item.critics} color="#38BDF8" />
                <BreakdownBar label="Público" pct={item.audience} color="#E11D48" />
              </div>

              {/* Chips das fontes */}
              {item.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.sources.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-[rgba(129,140,248,0.14)] px-2 py-0.5 text-xs text-[#A0A0B8]"
                    >
                      {sourceLabel(s)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <ScoreRing score={item.score} scale={item.scale} size={112} className="shrink-0" />
          </div>
        </motion.article>
      </AnimatePresence>

      {/* Indicadores de página */}
      <div className="mt-4 flex justify-center gap-1.5">
        {items.map((it, i) => (
          <button
            key={it.title}
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setCurrent(i)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === current ? 18 : 6,
              backgroundColor: i === current ? "#E11D48" : "rgba(129,140,248,0.25)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BreakdownBar({ label, pct, color }: { label: string; pct: number | null; color: string }) {
  const safe = pct != null ? Math.max(0, Math.min(100, pct)) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 shrink-0 text-[#80809B]">{label}</span>
      <div className="h-1 flex-1 rounded-full bg-[#1C1C2E]">
        <div
          className="h-full rounded-full"
          style={{ width: `${safe}%`, backgroundColor: color, transition: "width 600ms ease-out" }}
        />
      </div>
      <span className="w-7 shrink-0 text-right tabular-nums text-[#9CA3AF]">
        {Math.round(safe)}
      </span>
    </div>
  );
}
