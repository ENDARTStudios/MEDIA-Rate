"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { searchMedia } from "@/lib/api";
import { scoreColor } from "@/lib/design-tokens";

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  year: number;
  type: string;
  posterUrl: string | null;
  score: number | null;
}

const TYPE_LABELS: Record<string, string> = { Filme: "Filmes", Série: "Séries", Game: "Games" };

function tipoLabel(tipo: string): string {
  return tipo === "movie"
    ? "Filme"
    : tipo === "series"
      ? "Série"
      : tipo === "game"
        ? "Game"
        : tipo === "anime"
          ? "Anime"
          : tipo === "book"
            ? "Livro"
            : tipo === "comic"
              ? "HQ"
              : tipo;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SearchCommand() {
  const t = useTranslations("catalog");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const debouncedQuery = useDebounce(query, 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchMedia(debouncedQuery)
      .then((r) => {
        if (cancelled) return;
        setResults(
          r.slice(0, 15).map(({ media }) => ({
            id: media.id,
            slug: media.slug,
            title: media.title,
            year: media.year,
            type: tipoLabel(media.type),
            posterUrl: media.posterUrl,
            score: media.score?.consolidated ?? null,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const grouped: Record<string, SearchResult[]> = {};
  results.forEach((r) => {
    const group = TYPE_LABELS[r.type] || "Outros";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(r);
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    if (!open) {
      setQuery("");
      setSelectedIdx(0);
    }
  }, [open]);

  const totalResults = Object.values(grouped).reduce((s, g) => s + g.length, 0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, totalResults - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && totalResults > 0) {
        const flat = Object.values(grouped).flat();
        if (flat[selectedIdx]) {
          router.push(`/media/${flat[selectedIdx].slug}`);
          setOpen(false);
        }
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [totalResults, selectedIdx, grouped, router],
  );

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  let flatIdx = 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-[rgba(129,140,248,0.12)] bg-[#11111E] text-xs text-[#6B7280] hover:text-[#9CA3AF] hover:border-[rgba(129,140,248,0.25)] transition-colors"
        aria-label={t("search") ?? "Buscar mídia"}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span>{t("search") ?? "Buscar"}</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[#1C1C2E] text-[#6B7280] border border-[rgba(129,140,248,0.08)] font-mono">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-modal flex items-start justify-center pt-[15vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Busca global de mídia"
        >
          <div
            className="fixed inset-0 bg-[#09090F]/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={containerRef}
            className="relative w-full max-w-lg bg-[#11111E] border border-[rgba(129,140,248,0.15)] rounded-lg shadow-floating overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(129,140,248,0.08)]">
              <svg
                className="w-4 h-4 text-[#6B7280] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                placeholder="Buscar filmes, séries, games..."
                className="flex-1 bg-transparent text-sm text-[#EDE7DC] placeholder-[#6B7280] outline-none border-none"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-[#6B7280] hover:text-[#9CA3AF]"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#1C1C2E] text-[#6B7280] border border-[rgba(129,140,248,0.08)] font-mono">
                Esc
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {debouncedQuery.length < 2 && (
                <div className="px-4 py-10 text-center text-sm text-[#6B7280]">
                  Digite pelo menos 2 letras para buscar...
                </div>
              )}

              {debouncedQuery.length >= 2 && searching && (
                <div className="px-4 py-10 text-center text-sm text-[#6B7280]">
                  Buscando...
                </div>
              )}

              {debouncedQuery.length >= 2 && !searching && totalResults === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-[#9CA3AF] mb-1">Nenhum resultado encontrado.</p>
                  <p className="text-xs text-[#6B7280]">
                    Tente outro título ou explore o catálogo.
                  </p>
                </div>
              )}

              {debouncedQuery.length >= 2 &&
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-4 py-2 text-[10px] text-[#6B7280] uppercase tracking-widest font-medium bg-[#0D0D1A] border-b border-[rgba(129,140,248,0.04)]">
                      {group}
                    </div>
                    {items.map((item) => {
                      const idx = flatIdx++;
                      const isSelected = idx === selectedIdx;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            router.push(`/media/${item.slug}`);
                            setOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? "bg-[#1C1C2E]" : "hover:bg-[#151524]"}`}
                        >
                          <div className="w-8 h-12 bg-[#1C1C2E] rounded overflow-hidden shrink-0 flex items-center justify-center">
                            {item.posterUrl ? (
                              <img
                                src={item.posterUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <svg
                                className="w-4 h-4 text-[#6B7280]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#EDE7DC] font-heading truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-[#6B7280]">
                              {item.type} &middot; {item.year}
                            </p>
                          </div>
                          {item.score != null && (
                            <span
                              className="text-xs font-mono font-bold shrink-0 px-1.5 py-0.5 rounded"
                              style={{
                                color: scoreColor(item.score, "0-100"),
                                backgroundColor: `${scoreColor(item.score, "0-100")}15`,
                              }}
                            >
                              {item.score}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
