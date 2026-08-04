"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { getCatalog } from "@/lib/api";
import type { MediaType, Media, CatalogResponse } from "@/lib/types";
import { CatalogGrid } from "./CatalogGrid";
import { CatalogSkeleton } from "./CatalogSkeleton";
import { CatalogFiltersClient } from "./CatalogFiltersClient";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "./MediaCard";
import { RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";

type CatalogSort = "title" | "year" | "score";

const PAGE_SIZE = 12;

function asCatalogSort(value: string | undefined): CatalogSort | undefined {
  switch (value) {
    case "title":
    case "year":
    case "score":
      return value;
    default:
      return undefined;
  }
}

function mapToMediaItem(media: Media): MediaItem {
  return {
    id: media.id,
    titulo: media.title,
    tipo:
      media.type === "movie"
        ? "FILME"
        : media.type === "series"
          ? "SERIE"
          : media.type === "game"
            ? "GAME"
            : media.type === "anime"
              ? "ANIME"
              : media.type === "comic"
                ? "COMIC"
                : "LIVRO",
    ano_lancamento: media.year,
    imagem_url: media.posterUrl,
    score: media.score?.consolidated ?? null,
  };
}

function CatalogContent({
  initialData,
  initialType,
  initialSort,
  initialQuery,
}: {
  initialData?: CatalogResponse;
  initialType?: string;
  initialSort?: string;
  initialQuery?: string;
}) {
  const t = useTranslations("catalog");
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const type = (sp.get("type") || initialType || undefined) as MediaType | undefined;
  const sort = sp.get("sort") || initialSort || undefined;
  const query = sp.get("q") || initialQuery || undefined;

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["catalog", { type, sort, query }],
    queryFn: () => getCatalog({ type, search: query, sort: asCatalogSort(sort), limit: PAGE_SIZE }),
    initialData:
      type === undefined && sort === undefined && query === undefined ? initialData : undefined,
    staleTime: 5 * 60 * 1000,
  });

  // Acumulação das páginas (paginação cursor-based).
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  useEffect(() => {
    if (!data) return;
    setItems(data.items.map(mapToMediaItem));
    setNextCursor(data.nextCursor ?? null);
    setHasMore(data.hasMore);
    setLoadMoreError(false);
  }, [data]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const next = await getCatalog({
        type,
        search: query,
        sort: asCatalogSort(sort),
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
      setItems((prev) => [...prev, ...next.items.map(mapToMediaItem)]);
      setNextCursor(next.nextCursor ?? null);
      setHasMore(next.hasMore);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  if (isLoading && !data) {
    return <CatalogSkeleton count={PAGE_SIZE} />;
  }

  if (error instanceof RateLimitedError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RateLimited retryAfterSeconds={error.retryAfterSeconds} onRetry={() => refetch()} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
        <svg
          className="w-14 h-14 text-red-500/60 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <p className="text-[#9CA3AF] mb-4">{t("error")}</p>
        <Button onClick={() => refetch()}>{t("retry")}</Button>
      </div>
    );
  }

  if (error && data) {
    return (
      <>
        <div
          className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg"
          role="alert"
        >
          <svg
            className="w-4 h-4 text-red-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-sm text-red-300">{t("error")}</p>
          <Button size="sm" onClick={() => refetch()} className="ml-auto">
            {t("retry")}
          </Button>
        </div>
        <p className="text-sm text-[#9CA3AF] mb-4">{t("count", { count: data.total })}</p>
        <CatalogGrid medias={items} />
      </>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
        <svg
          className="w-14 h-14 text-gray-600 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-[#9CA3AF] mb-4">{t("noResults")}</p>
        <Button
          variant="outline"
          onClick={() => {
            router.replace(pathname);
          }}
        >
          {t("clearFilters")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-[#9CA3AF] mb-4">{t("count", { count: data.total })}</p>
      {isFetching && !isLoading && (
        <div className="mb-3 flex items-center gap-2 text-xs text-[#6B7280]" aria-live="polite">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {t("loadingCatalog")}
        </div>
      )}
      <CatalogGrid medias={items} />
      {hasMore && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="min-w-44">
            {loadingMore ? t("loadingCatalog") : t("loadMore")}
          </Button>
          {loadMoreError && (
            <p className="text-sm text-red-400" role="alert">
              {t("error")}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export function CatalogPageClient({
  initialData,
  initialType,
  initialSort,
  initialQuery,
}: {
  initialData?: CatalogResponse;
  initialType?: string;
  initialSort?: string;
  initialQuery?: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <Suspense fallback={null}>
        <MobileFilterBar drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />
      </Suspense>
      <aside className="hidden lg:block w-60 shrink-0">
        <Suspense fallback={null}>
          <CatalogFiltersClient />
        </Suspense>
      </aside>
      <div className="flex-1 min-w-0">
        <Suspense fallback={<CatalogSkeleton count={12} />}>
          <CatalogContent
            initialData={initialData}
            initialType={initialType}
            initialSort={initialSort}
            initialQuery={initialQuery}
          />
        </Suspense>
      </div>
    </div>
  );
}

function MobileFilterBar({
  drawerOpen,
  setDrawerOpen,
}: {
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
}) {
  const tFilters = useTranslations("catalogFilters");
  const sp = useSearchParams();
  const activeCount = [...new URLSearchParams(sp.toString()).keys()].filter((k) => k !== "").length;

  return (
    <>
      <div className="lg:hidden flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
          {tFilters("filters")}
          {activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </div>
      {drawerOpen && (
        <div className="fixed inset-0 z-drawer lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface-card shadow-floating p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-[#EDE7DC] text-sm">{tFilters("filters")}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-[#9CA3AF] hover:text-gray-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <CatalogFiltersClient />
          </div>
        </div>
      )}
    </>
  );
}
