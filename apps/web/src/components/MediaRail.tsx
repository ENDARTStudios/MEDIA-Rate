"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { MOCK_MEDIA } from "@/lib/api";

const TYPE_MAP: Record<string, "FILME" | "SERIE" | "GAME"> = {
  movie: "FILME",
  series: "SERIE",
  game: "GAME",
  anime: "SERIE",
};

const LABELS: Record<string, string> = {
  FILME: "filmes",
  SERIE: "series",
  GAME: "games",
};

const COLORS: Record<string, string> = {
  FILME: "#38BDF8",
  SERIE: "#818CF8",
  GAME: "#F59E0B",
};

function buildMediaItems(mediaType: "movie" | "series" | "game"): MediaItem[] {
  return MOCK_MEDIA
    .filter((m) => {
      if (mediaType === "movie") return m.type === "movie";
      if (mediaType === "series") return m.type === "series" || m.type === "anime";
      if (mediaType === "game") return m.type === "game";
      return false;
    })
    .slice(0, 8)
    .map((m) => ({
      id: m.id,
      titulo: m.title,
      tipo: TYPE_MAP[m.type] || "FILME",
      ano_lancamento: m.year,
      imagem_url: m.posterUrl,
      score: m.score?.consolidated ?? null,
    }));
}

const RAIL_ITEMS: Record<string, MediaItem[]> = {
  FILME: buildMediaItems("movie"),
  SERIE: buildMediaItems("series"),
  GAME: buildMediaItems("game"),
};

export function MediaRail({ mediaType }: { mediaType: "FILME" | "SERIE" | "GAME" }) {
  const shouldReduce = useReducedMotion();
  const t = useTranslations("mediarail");
  const railRef = useRef<HTMLDivElement>(null);
  const items = RAIL_ITEMS[mediaType] || [];
  const color = COLORS[mediaType];
  const labelKey = LABELS[mediaType] as "filmes" | "series" | "games";

  if (items.length === 0) return null;

  return (
    <section className="py-10 px-4" aria-labelledby={`rail-${mediaType}`}>
      <div className="max-w-7xl mx-auto" ref={railRef}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          <h2 id={`rail-${mediaType}`} className="font-heading text-xl font-bold text-[#EDE7DC] uppercase tracking-wider">
            {t(labelKey)}
          </h2>
          <div className="text-xs text-[#6B7280] font-body">
            {t("count", { count: items.length })}
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4" role="list" aria-label={t("ariaLabel", { title: t(labelKey) })}>
          {items.map((media, i) => (
            <motion.div
              key={media.id}
              className="flex-shrink-0 w-[160px] sm:w-[180px] snap-start"
              initial={shouldReduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <MediaCard media={media} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
