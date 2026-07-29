export interface AgeRatingProps {
  rating?: string;
  type: "movie" | "tv" | "game";
  locale?: string;
}

const RATING_BY_LOCALE_MOVIE: Record<string, string> = {
  "pt-BR": "14",
  "en-US": "PG-13",
  "es-ES": "+12",
};

const RATING_BY_LOCALE_GAME: Record<string, string> = {
  "pt-BR": "12",
  "en-US": "ESRB: T",
  "es-ES": "+12",
};

export function AgeRating({ rating, type, locale = "pt-BR" }: AgeRatingProps) {
  const defaultRating = type === "game"
    ? RATING_BY_LOCALE_GAME[locale]
    : RATING_BY_LOCALE_MOVIE[locale];

  const displayRating = rating ?? defaultRating;

  if (!displayRating) return null;

  const label = type === "game" && !rating ? `${displayRating}` : displayRating;

  return (
    <div className="inline-flex items-center gap-1.5" data-testid="age-rating">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-[#6B7280] text-[10px] font-bold text-[#9CA3AF]">
        R
      </span>
      <span className="text-xs text-[#9CA3AF]">{label}</span>
    </div>
  );
}
