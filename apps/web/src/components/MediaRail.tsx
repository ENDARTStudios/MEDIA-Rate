"use client";

/**
 * Carrossel de mídia com scroll-snap e dados REAIS da API (Parte 3.1).
 *
 * - Busca via getCatalog (ordenação por score desc, 10 itens).
 * - Cabeçalho com CategoryChip (accent da mídia) + contagem real (total).
 * - Botões de navegação aparecem no hover (desktop); swipe nativo no mobile.
 * - Fallback: sem dados da API → seção oculta (nada de mock).
 */
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { getCatalog } from "@/lib/api";
import { CategoryChip } from "@/components/media-rate-ui/CategoryChip";
import { useQuery } from "@tanstack/react-query";
import type { MediaType } from "@/lib/types";

const TYPE_TO_MEDIA: Record<string, MediaType> = {
  FILME: "movie",
  SERIE: "series",
  GAME: "game",
  LIVRO: "book",
  COMIC: "comic",
  ANIME: "anime",
};

const TIPO_LABEL: Record<string, string> = {
  FILME: "filme",
  SERIE: "serie",
  GAME: "game",
  LIVRO: "livro",
  COMIC: "comic",
  ANIME: "anime",
};

const RAIL_LABEL: Record<string, string> = {
  FILME: "filmes",
  SERIE: "series",
  GAME: "games",
};

function mapToMediaItem(m: {
  id: string;
  title: string;
  type: MediaType;
  year: number | null;
  posterUrl: string | null;
  score?: { consolidated?: number | null } | null;
}): MediaItem {
  return {
    id: m.id,
    titulo: m.title,
    tipo:
      m.type === "movie"
        ? "FILME"
        : m.type === "series"
          ? "SERIE"
          : m.type === "game"
            ? "GAME"
            : m.type === "anime"
              ? "ANIME"
              : m.type === "comic"
                ? "COMIC"
                : "LIVRO",
    ano_lancamento: m.year,
    imagem_url: m.posterUrl,
    score: m.score?.consolidated ?? null,
  };
}

export function MediaRail({ mediaType }: { mediaType: "FILME" | "SERIE" | "GAME" }) {
  const shouldReduce = useReducedMotion();
  const t = useTranslations("mediarail");
  const railRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const mediaTypeKey = TYPE_TO_MEDIA[mediaType] ?? "movie";

  const { data, isLoading } = useQuery({
    queryKey: ["home-rail", mediaType],
    queryFn: () => getCatalog({ type: mediaTypeKey, sort: "score", order: "desc", limit: 10 }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading || !data || data.items.length === 0) return null;

  const items = data.items.map(mapToMediaItem);
  const total = data.total;

  function scroll(direction: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section
      className="py-10 px-4 group/rail"
      aria-labelledby={`rail-${mediaType}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <CategoryChip
              type={mediaTypeKey}
              count={total}
              active
              label={t(RAIL_LABEL[mediaType] as "filmes" | "series" | "games")}
            />
            <h2
              id={`rail-${mediaType}`}
              className="font-heading text-xl font-bold text-[#F5F5F7] uppercase tracking-wider"
            >
              {t(RAIL_LABEL[mediaType] as "filmes" | "series" | "games")}
            </h2>
          </div>

          <div
            className="hidden lg:flex items-center gap-2 transition-opacity duration-200"
            style={{ opacity: hovering ? 1 : 0 }}
            aria-hidden={!hovering}
          >
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2A2A3D] bg-[#12121C] text-[#A0A0B8] transition-colors hover:border-[#3A3A52] hover:text-[#F5F5F7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
              aria-label={`${t("ariaLabel", { title: t(RAIL_LABEL[mediaType] as "filmes" | "series" | "games") })} — anterior`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2A2A3D] bg-[#12121C] text-[#A0A0B8] transition-colors hover:border-[#3A3A52] hover:text-[#F5F5F7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
              aria-label={`${t("ariaLabel", { title: t(RAIL_LABEL[mediaType] as "filmes" | "series" | "games") })} — próxima`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <Link
              href={`/catalog?type=${mediaTypeKey}`}
              className="ml-1 text-xs font-medium text-[#818CF8] hover:text-[#A5B4FC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] rounded"
            >
              {t("ariaLabel", { title: t(RAIL_LABEL[mediaType] as "filmes" | "series" | "games") })}{" "}
              →
            </Link>
          </div>
        </div>

        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4"
          role="list"
          aria-label={t("ariaLabel", {
            title: t(RAIL_LABEL[mediaType] as "filmes" | "series" | "games"),
          })}
        >
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
