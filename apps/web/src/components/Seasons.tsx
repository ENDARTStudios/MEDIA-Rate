import { Badge } from "@/components/ui/badge";

export interface Season {
  number: number;
  title: string;
  episodeCount: number;
  score?: number;
}

export interface SeasonsProps {
  seasons: Season[];
  activeSeason?: number;
  onSelect?: (seasonNumber: number) => void;
}

export function Seasons({ seasons, activeSeason, onSelect }: SeasonsProps) {
  if (!seasons || seasons.length === 0) return null;

  return (
    <div className="py-4" data-testid="seasons">
      <h3 className="text-sm font-heading font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
        Temporadas
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist">
        {seasons.map((s) => {
          const isActive = s.number === activeSeason;
          return (
            <button
              key={s.number}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect?.(s.number)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-[#818CF8] text-[#0F172A]"
                  : "bg-[#1C1C2E] text-[#9CA3AF] hover:text-[#EDE7DC]"
              }`}
            >
              {s.title || `Temporada ${s.number}`}
              {s.score !== undefined && (
                <span className="ml-2 inline-flex">
                  <Badge variant="score" score={s.score} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
