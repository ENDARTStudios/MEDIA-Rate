"use client";

/**
 * Chip de categoria de mídia com accent (Parte 2.3 do redesign).
 *
 * - Ícone lucide + label + contagem opcional ("Filmes (196)").
 * - Accent por mídia: movie #818CF8, series #38BDF8, game #34D399,
 *   book #FBBF24, comic #F472B6, anime #A78BFA.
 * - Estado ativo: fundo/accent no chip; foco visível para teclado.
 */
import { useLocale, useTranslations } from "next-intl";
import { formatarScoreLocale } from "@/lib/score-utils";
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
  manga: CATEGORY_TOKENS.manga.color,
};

export interface CategoryChipProps {
  type: MediaType;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  label?: string;
  className?: string;
}

/** Chaves do namespace "catalog" por tipo (filme/serie/game/livro/manga/comic). */
const TIPO_KEY: Record<MediaType, string> = {
  movie: "filme",
  series: "serie",
  game: "game",
  book: "livro",
  comic: "comic",
  manga: "manga",
};

/**
 * Formato compacto: 1200 → "1,2k" em pt-BR e "1.2k" em en-US.
 *
 * Achado 2026-10-13: a versão anterior fazia `toFixed(1).replace(".", ",")`, isto é,
 * **assumia pt-BR dentro do código** — em ingles ou espanhol o número saía com vírgula
 * mesmo assim. Agora o separador vem do locale, pelo mesmo helper do resto do produto.
 */
function formatoCompacto(n: number, locale: string): string {
  if (n >= 1000) {
    const v = n / 1000;
    return `${v % 1 === 0 ? v.toFixed(0) : formatarScoreLocale(v, locale)}k`;
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
  const locale = useLocale();
  const { color: accent, icon: Icon } = CATEGORY_TOKENS[type];
  const resolvedLabel =
    label ?? t(TIPO_KEY[type] as "filme" | "serie" | "game" | "livro" | "comic" | "manga");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg",
        active
          ? "border-transparent text-surface-bg"
          : "border-surface-border bg-transparent text-fg-secondary hover:text-fg-primary",
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
            "tabular-nums rounded-full px-1.5 text-xs leading-4",
            active ? "bg-black/20 text-inherit" : "bg-surface-elevated text-fg-muted",
          )}
        >
          {formatoCompacto(count, locale)}
        </span>
      )}
    </button>
  );
}
