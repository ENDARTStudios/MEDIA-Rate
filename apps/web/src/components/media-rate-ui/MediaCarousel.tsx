"use client";

/**
 * MediaCarousel (Parte 3.1, T185) — carrossel por categoria.
 *
 * - 6 categorias na ordem dos ícones do hero: Filme/Série/Game (dados reais
 *   da API via MediaCard) e Livro/HQ/Mangá (roadmap → LockedComingSoonCard
 *   com blur + cadeado; clique abre WaitlistCaptureModal que captura o
 *   e-mail via POST /api/v1/waitlist-notify).
 * - Scroll-snap horizontal; botões de navegação no hover (desktop) + swipe
 *   nativo (mobile). Cabeçalho = ícone 2D flat + nome + contagem no accent.
 * - A11y: aria-label no carrossel; botões de navegação acessíveis.
 */
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import { getCatalog, waitlistNotify } from "@/lib/api";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { LockedComingSoonCard } from "@/components/media-rate-ui/LockedComingSoonCard";
import type { MediaType } from "@/lib/types";

// T258: chaves por MediaType (lowercase) e por tipo da API — o bug era
// `type.toUpperCase()` gerar "SERIES" (plural) que não existia no mapa e o
// fallback silencioso `?? "movie"` fazer a seção SERIES carregar FILMES.
const TYPE_TO_API: Record<string, "movie" | "series" | "game"> = {
  movie: "movie",
  series: "series",
  game: "game",
  FILME: "movie",
  SERIE: "series",
  SERIES: "series",
  GAME: "game",
};

function mapToMediaItem(m: {
  id: string;
  title: string;
  type: string;
  year: number;
  posterUrl: string | null;
  score?: { consolidated?: number | null } | null;
}): MediaItem {
  return {
    id: m.id,
    titulo: m.title,
    tipo: m.type.toUpperCase(),
    ano_lancamento: m.year,
    imagem_url: m.posterUrl,
    score: m.score?.consolidated ?? null,
  };
}

const TIPO_KEY: Record<MediaType, string> = {
  movie: "filme",
  series: "serie",
  game: "game",
  book: "livro",
  comic: "comic",
  manga: "manga",
};

/** Categorias sem catálogo ativo → cards bloqueados + waitlist. */
const ROADMAP: ReadonlySet<MediaType> = new Set(["book", "comic", "manga"]);

export interface MediaCarouselProps {
  type: MediaType;
  count?: number;
  className?: string;
}

export function MediaCarousel({ type, count, className }: MediaCarouselProps) {
  const t = useTranslations("catalog");
  const listRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const { color: accent, icon: Icon } = CATEGORY_TOKENS[type];

  const { data } = useQuery({
    queryKey: ["carousel", type],
    queryFn: () =>
      ROADMAP.has(type)
        ? null
        : getCatalog({ type: TYPE_TO_API[type] ?? TYPE_TO_API[type.toUpperCase()] ?? "movie", sort: "score", order: "desc", limit: 10 }),
    staleTime: 5 * 60 * 1000,
    enabled: !ROADMAP.has(type),
  });

  const items: MediaItem[] = (data?.items ?? []).map(mapToMediaItem);
  const total = count ?? data?.total ?? items.length;

  const scroll = (dir: 1 | -1) => {
    listRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const handleNotify = async (email: string) => {
    setBusy(true);
    try {
      await waitlistNotify(email, type);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={cn("py-8 px-4", className)}
      aria-labelledby={`carousel-${type}`}
      data-testid={`carousel-${type}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}1F`, color: accent }}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
          <h2
            id={`carousel-${type}`}
            className="font-heading text-lg font-bold text-[#F5F5F7] uppercase tracking-wider"
          >
            {t(TIPO_KEY[type] as "filme" | "serie" | "game" | "livro" | "comic" | "manga")}
          </h2>
          {total != null && total > 0 && (
            <span className="tabular-nums text-xs text-[#80809B]">{total}</span>
          )}
          {!ROADMAP.has(type) && (
            <div className="ml-auto hidden gap-2 lg:flex">
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label={`Anterior — ${t(TIPO_KEY[type] as "filme" | "serie" | "game")}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2A2A3D] text-[#A0A0B8] transition-colors hover:border-[#3A3A52] hover:text-[#F5F5F7]"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label={`Próximo — ${t(TIPO_KEY[type] as "filme" | "serie" | "game")}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2A2A3D] text-[#A0A0B8] transition-colors hover:border-[#3A3A52] hover:text-[#F5F5F7]"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {ROADMAP.has(type) ? (
          <div
            ref={listRef}
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4"
            aria-label={t(TIPO_KEY[type] as "livro" | "comic" | "manga")}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[160px] sm:w-[180px] flex-shrink-0 snap-start">
                <LockedComingSoonCard
                  type={type}
                  variante={i}
                  onNotify={busy ? undefined : handleNotify}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={listRef}
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4"
            aria-label={t(TIPO_KEY[type] as "filme" | "serie" | "game")}
          >
            {items.map((m) => (
              <div key={m.id} className="w-[160px] sm:w-[180px] flex-shrink-0 snap-start">
                <MediaCard media={m} />
              </div>
            ))}
            {items.length === 0 && (
              <p className="py-12 text-sm text-[#80809B]">{t("noResults")}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
