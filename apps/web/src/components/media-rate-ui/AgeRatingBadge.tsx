"use client";

/**
 * Selo de classificação indicativa (Addendum 2 §2).
 *
 * - Escala DJCTQ/ClassInd: L, 10, 12, 14, 16, 18 (oficial p/ filme/série/game).
 * - Livro/HQ/Mangá: `source="sugerida"` — rotula como sugestão da editora,
 *   nunca como órgão oficial.
 * - `perSeason`: exibe a nota "pode variar por temporada".
 * - Descritores (Violência, Conteúdo Sexual, Drogas, Linguagem) opcionais —
 *   nunca inventados quando a fonte não informar.
 */
import { cn } from "@/lib/utils";

export type AgeRating = "L" | "10" | "12" | "14" | "16" | "18";

export interface AgeRatingBadgeProps {
  rating: AgeRating;
  descriptors?: string[];
  source?: "oficial" | "sugerida";
  perSeason?: boolean;
  className?: string;
}

const RATING_COLORS: Record<AgeRating, { bg: string; fg: string }> = {
  "L": { bg: "rgba(52,211,153,0.15)", fg: "#34D399" },
  "10": { bg: "rgba(56,189,248,0.15)", fg: "#38BDF8" },
  "12": { bg: "rgba(251,191,36,0.15)", fg: "#FBBF24" },
  "14": { bg: "rgba(249,115,22,0.15)", fg: "#F97316" },
  "16": { bg: "rgba(244,114,182,0.15)", fg: "#F472B6" },
  "18": { bg: "rgba(248,113,113,0.2)", fg: "#F87171" },
};

const DESCRIPTOR_LABELS: Record<string, string> = {
  "violência": "Violência",
  "violencia": "Violência",
  "conteúdo sexual": "Conteúdo Sexual",
  "conteudo sexual": "Conteúdo Sexual",
  "drogas": "Drogas",
  "linguagem imprópria": "Linguagem Imprópria",
  "linguagem impropria": "Linguagem Imprópria",
};

export function AgeRatingBadge({
  rating,
  descriptors,
  source = "oficial",
  perSeason = false,
  className,
}: AgeRatingBadgeProps) {
  const colors = RATING_COLORS[rating] ?? RATING_COLORS["L"];
  const labels = (descriptors ?? [])
    .map((d) => DESCRIPTOR_LABELS[d.toLowerCase()] ?? d)
    .slice(0, 4);

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="age-rating-badge">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-bold tabular-nums"
        style={{ backgroundColor: colors.bg, color: colors.fg, borderColor: `${colors.fg}44` }}
        title={
          source === "sugerida"
            ? "Classificação sugerida pela editora"
            : "Classificação indicativa (ClassInd)"
        }
      >
        {rating}
      </span>
      <div className="text-[11px] leading-tight text-[#6B6B85]">
        {source === "sugerida" && <span>Classificação sugerida pela editora</span>}
        {perSeason && <span>Pode variar por temporada</span>}
        {labels.length > 0 && (
          <span className="mt-0.5 block">
            {labels.map((label, i) => (
              <span
                key={label}
                className="mr-1.5 inline-flex items-center gap-0.5 rounded-full bg-[#1B1B2C] px-1.5 py-px text-[10px] text-[#A0A0B8]"
              >
                {label}
                {i < labels.length - 1 ? "" : ""}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
