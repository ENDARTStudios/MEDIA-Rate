"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { Button } from "@/components/ui/button";

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

export function WatchlistClient() {
  const t = useTranslations("watchlist");
  const { entries, isLoading, error, fetchWatchlist } = useWatchlistStore();

  useEffect(() => {
    fetchWatchlist();
  }, []);

  if (isLoading && entries.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-display font-bold text-gray-100 mb-8">{t("title")}</h1>
        <CatalogSkeleton count={6} />
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-display font-bold text-gray-100 mb-8">{t("title")}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
          <svg className="w-14 h-14 text-red-400/60 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-gray-400 mb-2">{error}</p>
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
        <h1 className="text-3xl font-display font-bold text-gray-100 mb-8">{t("title")}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
          <svg className="w-14 h-14 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-gray-400 mb-4">{t("empty")}</p>
          <Link href="/catalog">
            <Button>{t("exploreCatalog")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-display font-bold text-gray-100 mb-8">{t("title")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const columnEntries = entries.filter(
            (e) => (e.status ?? e.coluna) === col.key
          );

          return (
            <div
              key={col.key}
              className="flex flex-col rounded-xl bg-[#11111E] border border-[#1C1C2E] p-4 min-h-[200px]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-200">{t(col.i18nKey)}</h2>
                <span className="text-xs text-gray-500 bg-[#1C1C2E] px-2 py-0.5 rounded-full">
                  {columnEntries.length}
                </span>
              </div>

              {columnEntries.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-gray-600">{t("emptyColumn")}</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {columnEntries.map((entry) => {
                    if (entry.media) {
                      const mediaItem: MediaItem = {
                        id: entry.media.id ?? entry.mediaId,
                        titulo: entry.media.titulo ?? "",
                        tipo: entry.media.tipo ?? "FILME",
                        ano_lancamento: entry.media.ano_lancamento ?? null,
                        imagem_url: entry.media.imagem_url ?? null,
                        score: entry.media.score ?? null,
                      };
                      return <MediaCard key={entry.id} media={mediaItem} />;
                    }
                    return (
                      <div
                        key={entry.id}
                        className="bg-[#1C1C2E] rounded-lg p-3 border border-[#2A2A3E]"
                      >
                        <Link
                          href={`/media/${entry.mediaId}`}
                          className="block text-sm font-medium text-gray-200 hover:text-[#818CF8] truncate transition-colors"
                        >
                          {t("mediaItem", { id: entry.mediaId })}
                        </Link>
                      </div>
                    );
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
