"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { searchMedia, slugify } from "@/lib/api";
import { scoreColor, CATEGORY_TOKENS } from "@/lib/design-tokens";
import { normalizeDisplayScore } from "@/lib/score-utils";
import type { MediaType } from "@/lib/types";

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  year: number;
  type: string;
  rawType: string;
  posterUrl: string | null;
  score: number | null;
}

// T243: rótulos de tipo via chaves i18n (catalog.typeMovie/typeSerie/...)
// — nunca strings PT hardcoded (EN/ES mostravam 'Filme/Série/Game').
function tipoLabel(tipo: string, t: (key: string) => string): string {
  switch (tipo) {
    case "movie":
      return t("typeMovie");
    case "series":
      return t("typeSerie");
    case "game":
      return t("typeGame");
    case "manga":
      return t("typeManga");
    case "book":
      return t("typeBook");
    case "comic":
      return t("typeComic");
    default:
      return tipo;
  }
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
  // T246: hint de tecla por plataforma (⌘ no Mac, Ctrl no Windows/Linux).
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform ?? "");
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
            type: tipoLabel(media.type, t),
            rawType: media.type,
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
    // T243: agrupa pelo rótulo JÁ traduzido (r.type) — nunca por chave PT.
    const group = r.type || "Outros";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(r);
  });

  // T199 (§3.5): agrupamento visual por obra — títulos iguais em mídias
  // diferentes (Matrix filme + game + HQ) aparecem lado a lado com os
  // ícones de tipo, indicando que são relacionados antes de abrir a ficha.
  const relatedGroups = new Map<string, SearchResult[]>();
  results.forEach((r) => {
    const key = slugify(r.title);
    if (!relatedGroups.has(key)) relatedGroups.set(key, []);
    relatedGroups.get(key)!.push(r);
  });
  const relatedGroupsList = [...relatedGroups.values()].filter((g) => g.length >= 2);
  const relatedIds = new Set(relatedGroupsList.flat().map((r) => r.id));
  const groupedRest: Record<string, SearchResult[]> = {};
  results.forEach((r) => {
    if (relatedIds.has(r.id)) return;
    const group = r.type || "Outros";
    if (!groupedRest[group]) groupedRest[group] = [];
    groupedRest[group].push(r);
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // T246: Ctrl+K (Windows/Linux) e ⌘K (Mac) — paridade; case-insensitive
      // ('k' ou 'K' com Caps Lock); nunca dispara com foco em campo editável.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        const alvo = e.target as HTMLElement | null;
        const editavel =
          alvo instanceof HTMLInputElement ||
          alvo instanceof HTMLTextAreaElement ||
          (alvo?.isContentEditable ?? false);
        if (editavel) return;
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

  const totalResults =
    relatedGroupsList.reduce((s, g) => s + g.length, 0) +
    Object.values(groupedRest).reduce((s, g) => s + g.length, 0);

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
        const flatAll = [...relatedGroupsList.flat(), ...Object.values(groupedRest).flat()];
        if (flatAll[selectedIdx]) {
          router.push(`/media/${flatAll[selectedIdx].slug}`);
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
          {/* T246: hint por plataforma — ⌘ K no Mac, Ctrl K no Windows/Linux. */}
          <span className="text-[10px]">{isMac ? "⌘" : "Ctrl"}</span>K
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
                  {t("paletaMinChars")}
                </div>
              )}

              {debouncedQuery.length >= 2 && searching && (
                <div className="px-4 py-10 text-center text-sm text-[#6B7280]">{t("paletaSearching")}</div>
              )}

              {debouncedQuery.length >= 2 && !searching && totalResults === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-[#9CA3AF] mb-1">{t("paletaEmpty")}</p>
                  <p className="text-xs text-[#6B7280]">
                    {t("paletaEmptyHint")}
                  </p>
                </div>
              )}

              {debouncedQuery.length >= 2 &&
                relatedGroupsList.map((g) => (
                  <div key={`rel-${slugify(g[0].title)}`}>
                    <div className="px-4 py-2 text-[10px] text-[#818CF8] uppercase tracking-widest font-medium bg-[#0D0D1A] border-b border-[rgba(129,140,248,0.04)]">
                      Relacionados
                    </div>
                    <div className="flex items-center gap-1.5 px-4 py-2.5">
                      {g.map((item) => {
                        const token = CATEGORY_TOKENS[item.rawType as MediaType];
                        const Icon = token?.icon ?? CATEGORY_TOKENS.movie.icon;
                        const idx = flatIdx++;
                        const isSelected = idx === selectedIdx;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              router.push(`/media/${item.slug}`);
                              setOpen(false);
                            }}
                            className={`flex items-center gap-1.5 rounded-full border border-[rgba(129,140,248,0.15)] px-3 py-1.5 text-xs text-[#EDE7DC] transition-colors ${isSelected ? "bg-[#1C1C2E]" : "hover:bg-[#151524]"}`}
                          >
                            <Icon
                              className="h-3.5 w-3.5"
                              style={{ color: token?.color }}
                              aria-hidden="true"
                            />
                            {item.title}
                            <span className="text-[#6B7280]">{item.year}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {debouncedQuery.length >= 2 &&
                Object.entries(groupedRest).map(([group, items]) => (
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
                                color: scoreColor(
                                  normalizeDisplayScore(
                                    item.score,
                                    item.type === "Game" ? "game" : "movie",
                                  ),
                                  item.type === "Game" ? "0-100" : "0-10",
                                ),
                                backgroundColor: `${scoreColor(
                                  normalizeDisplayScore(
                                    item.score,
                                    item.type === "Game" ? "game" : "movie",
                                  ),
                                  item.type === "Game" ? "0-100" : "0-10",
                                )}15`,
                              }}
                            >
                              {normalizeDisplayScore(
                                item.score,
                                item.type === "Game" ? "game" : "movie",
                              )}
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
