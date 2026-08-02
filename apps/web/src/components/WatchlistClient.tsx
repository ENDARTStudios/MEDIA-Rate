"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { Button } from "@/components/ui/button";
import { RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";
import { MOCK_MEDIA } from "@/lib/api";

// Build lookup for midia_id → title resolution
const byId = new Map(MOCK_MEDIA.map((m) => [m.id, m]));

interface ColumnDef {
  key: string;
  label: string;
  i18nKey: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "WANT", label: "Quero Ver", i18nKey: "queroVer" },
  { key: "WATCHING", label: "Vendo", i18nKey: "vendo" },
  { key: "COMPLETED", label: "Vi", i18nKey: "vi" },
];

function MoveDropdown({ entryId, currentStatus }: { entryId: string; currentStatus: string }) {
  const { moveItem } = useWatchlistStore();
  const t = useTranslations("watchlist");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const targets = COLUMNS.filter((c) => c.key !== currentStatus);

  if (targets.length === 0) return null;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="text-xs text-[#6B7280] hover:text-[#818CF8] transition-colors flex items-center gap-1"
      >
        {loading ? "..." : t("moveTo")} ▾
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-1 w-32 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md shadow-floating py-1 z-dropdown"
          onMouseLeave={() => setOpen(false)}
        >
          {targets.map((col) => (
            <button
              key={col.key}
              onClick={async () => {
                setLoading(true);
                try {
                  await moveItem(entryId, col.key);
                } catch {}
                setLoading(false);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-1.5 text-xs text-[#9CA3AF] hover:bg-[#1C1C2E] hover:text-[#EDE7DC] transition-colors"
            >
              {t(col.i18nKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WatchlistClient() {
  const t = useTranslations("watchlist");
  const { entries, isLoading, error, fetchWatchlist, removeItem } = useWatchlistStore();
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  if (isLoading && entries.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{t("title")}</h1>
        <CatalogSkeleton count={6} />
      </div>
    );
  }

  if (error instanceof RateLimitedError) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{t("title")}</h1>
        <RateLimited retryAfterSeconds={error.retryAfterSeconds} onRetry={() => fetchWatchlist()} />
      </div>
    );
  }

  if (error && entries.length === 0) {
    const errorMsg = typeof error === "string" ? error : error.message;
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{t("title")}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
          <svg
            className="w-14 h-14 text-red-400/60 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-[#9CA3AF] mb-2">{errorMsg}</p>
          <Button onClick={() => fetchWatchlist()} variant="ghost" size="sm">
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{t("title")}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
          <svg
            className="w-14 h-14 text-[#6B7280] mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <p className="text-[#9CA3AF] mb-4">{t("empty")}</p>
          <Link href="/catalog">
            <Button>{t("emptyCta")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{t("title")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const columnEntries = entries.filter((e) => (e.status ?? e.coluna) === col.key);
          // T142: Hide orphans (entries whose midia_id not in catalog)
          const visible = columnEntries.filter((e) => byId.has(e.mediaId));

          return (
            <div
              key={col.key}
              className="flex flex-col rounded-md bg-[#11111E] border border-[rgba(129,140,248,0.08)] p-4 min-h-[200px]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#EDE7DC]">{t(col.i18nKey)}</h2>
                <span className="text-xs text-[#9CA3AF] bg-[#1C1C2E] px-2 py-0.5 rounded-full">
                  {visible.length}
                </span>
              </div>

              {visible.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-[#6B7280]">{t("empty")}</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {visible.map((entry) => {
                    const m = byId.get(entry.mediaId);
                    if (m) {
                      const mediaItem: MediaItem = {
                        id: m.id,
                        titulo: m.title,
                        tipo: m.type === "movie" ? "FILME" : m.type === "series" ? "SERIE" : "GAME",
                        ano_lancamento: m.year,
                        imagem_url: m.posterUrl,
                        score: m.score?.consolidated ?? null,
                      };
                      return (
                        <div key={entry.id} className="max-w-[200px]">
                          <MediaCard media={mediaItem} />
                          <div className="flex items-center justify-between mt-1 px-1">
                            <MoveDropdown entryId={entry.id} currentStatus={col.key} />
                            <button
                              onClick={async () => {
                                setDeleting(entry.id);
                                try {
                                  await removeItem(entry.id);
                                } catch {}
                                setDeleting(null);
                              }}
                              disabled={deleting === entry.id}
                              className="text-xs text-[#6B7280] hover:text-red-400 transition-colors"
                            >
                              {deleting === entry.id ? "..." : t("removeFromWatchlist")}
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
