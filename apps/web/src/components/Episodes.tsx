"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export interface Episode {
  number: number;
  title: string;
  synopsis?: string;
  score?: number;
  runtime?: string;
}

export interface EpisodesProps {
  episodes: Episode[];
  seasonNumber: number;
}

export function Episodes({ episodes, seasonNumber }: EpisodesProps) {
  if (!episodes || episodes.length === 0) return null;

  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="py-4" data-testid="episodes">
      <h3 className="text-sm font-heading font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
        Episódios — Temporada {seasonNumber}
      </h3>
      <div className="space-y-1">
        {episodes.map((ep) => {
          const isOpen = expanded === ep.number;
          return (
            <div
              key={ep.number}
              className="border border-[#1C1C2E] rounded-lg overflow-hidden"
              data-testid={`episode-${ep.number}`}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : ep.number)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1C1C2E]/50 transition-colors"
              >
                <span className="text-xs text-[#6B7280] w-6 shrink-0 tabular-nums">
                  {ep.number}
                </span>
                <span className="text-sm text-[#EDE7DC] flex-1 truncate">{ep.title}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {ep.score !== undefined && <Badge variant="score" score={ep.score} />}
                  {ep.runtime && (
                    <span className="text-xs text-[#6B7280] tabular-nums">{ep.runtime}</span>
                  )}
                </span>
                <svg
                  className={`w-4 h-4 text-[#6B7280] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && ep.synopsis && (
                <div className="px-4 pb-4 pt-0 border-t border-[#1C1C2E]">
                  <p className="text-xs text-[#9CA3AF] leading-relaxed mt-3">{ep.synopsis}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
