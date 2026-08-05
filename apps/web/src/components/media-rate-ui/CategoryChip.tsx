"use client";

/**
 * Chip de categoria de mídia com accent (Parte 2.3 do redesign).
 *
 * - Ícone lucide + label + contagem opcional ("Filmes (196)").
 * - Accent por mídia: movie #818CF8, series #38BDF8, game #34D399,
 *   book #FBBF24, comic #F472B6, anime #A78BFA.
 * - Estado ativo: fundo/accent no chip; foco visível para teclado.
 */
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

/** Alias de compatibilidade — fonte única de verdade é CATEGORY_TOKENS (T183). */
export const MEDIA_ACCENTS: Record<MediaType, string> = {
  movie: CATEGORY_TOKENS.movie.color,
  series: CATEGORY_TOKENS.series.color,
  game: CATEGORY_TOKENS.game.color,
  book: CATEGORY_TOKENS.book.color,
  comic: CATEGORY_TOKENS.comic.color,
  anime: CATEGORY_TOKENS.anime.color,
};

export interface CategoryChipProps {
  type: MediaType;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  label?: string;
  className?: string;
}

/** Chaves do namespace "catalog" por tipo (filme/serie/game/livro/anime/comic). */
const TIPO_KEY: Record<MediaType, string> = {
  movie: "filme",
  series: "serie",
  game: "game",
  book: "livro",
  comic: "comic",
  anime: "anime",
};

/** Formato compacto: 1200 → "1.2k". */
function formatoCompacto(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(".", ",")}k`;
  }
  return String(n);
}

export function CategoryChip({
  type,
  count,
  active = false,
  onClick,
  label,
  className,
}: CategoryChipProps) {
  const t = useTranslations("catalog");
  const { color: accent, icon: Icon } = CATEGORY_TOKENS[type];
  const resolvedLabel = label ?? t(TIPO_KEY[type] as "filme" | "serie" | "game" | "livro" | "comic" | "anime");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05050A]",
        active
          ? "border-transparent text-[#05050A]"
          : "border-[#2A2A3D] bg-transparent text-[#A0A0B8] hover:text-[#F5F5F7]",
        className,
      )}
      style={
        active
          ? { backgroundColor: accent, boxShadow: `0 0 0 1px ${accent}` }
          : { ["--chip-accent" as string]: accent }
      }
      data-testid={`category-chip-${type}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{resolvedLabel}</span>
      {count != null && (
        <span
          className={cn(
            "tabular-nums rounded-full px-1.5 text-[10px] leading-4",
            active ? "bg-black/20 text-inherit" : "bg-[#1B1B2C] text-[#80809B]",
          )}
        >
          {formatoCompacto(count)}
        </span>
      )}
    </button>
  );
}
