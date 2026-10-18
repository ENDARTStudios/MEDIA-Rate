"use client";

/**
 * Taxonomia dupla de gêneros (Addendum 2 §4).
 *
 * - Gêneros narrativos compartilhados (vocabulário em todas as mídias) em
 *   destaque; subgêneros específicos da mídia na segunda linha.
 * - Clicar em um gênero abre o GenreFilterPrompt (mesma mídia vs. cross-media).
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GenreFilterPrompt } from "./GenreFilterPrompt";
import type { MediaType } from "@/lib/types";

/** Vocabulário narrativo compartilhado entre mídias (Addendum 2 §4.1). */
export const SHARED_GENRES = [
  "Ação",
  "Aventura",
  "Comédia",
  "Drama",
  "Terror",
  "Ficção Científica",
  "Fantasia",
  "Romance",
  "Mistério",
  "Suspense",
];

export interface GenreChipRowProps {
  sharedGenres: string[];
  mediaSpecificGenres: string[];
  mediaType: MediaType;
  className?: string;
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-surface-border bg-surface-elevated px-3 py-1 text-xs text-fg-secondary transition-colors hover:border-surface-border-hover hover:text-fg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo"
    >
      {label}
    </button>
  );
}

export function GenreChipRow({
  sharedGenres,
  mediaSpecificGenres,
  mediaType,
  className,
}: GenreChipRowProps) {
  const [prompt, setPrompt] = useState<string | null>(null);

  if (sharedGenres.length === 0 && mediaSpecificGenres.length === 0) {
    return (
      <p className={cn("text-sm text-fg-muted", className)} role="status">
        Não informado
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)} data-testid="genre-chip-row">
      <div className="flex flex-wrap gap-1.5">
        {sharedGenres.map((g) => (
          <Chip key={g} label={g} onClick={() => setPrompt(g)} />
        ))}
      </div>
      {mediaSpecificGenres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 opacity-80">
          {mediaSpecificGenres.map((g) => (
            <Chip key={g} label={g} onClick={() => setPrompt(g)} />
          ))}
        </div>
      )}
      {prompt && (
        <GenreFilterPrompt
          genre={prompt}
          mediaType={mediaType}
          open={prompt != null}
          onOpenChange={(open) => {
            if (!open) setPrompt(null);
          }}
        />
      )}
    </div>
  );
}
