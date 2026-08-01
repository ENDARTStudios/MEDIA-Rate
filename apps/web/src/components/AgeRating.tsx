export interface AgeRatingProps {
  rating?: string;
  type: "movie" | "tv" | "game";
  locale?: string;
}

export function AgeRating({ rating, type, locale = "pt-BR" }: AgeRatingProps) {
  if (!rating) return null;

  return (
    <div className="inline-flex items-center gap-1.5" data-testid="age-rating">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-[#6B7280] text-[10px] font-bold text-[#9CA3AF]">
        R
      </span>
      <span className="text-xs text-[#9CA3AF]">{rating}</span>
    </div>
  );
}
