"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { getCatalog } from "@/lib/api";
import type { MediaType } from "@/lib/types";
import { CatalogGrid } from "./CatalogGrid";
import { CatalogSkeleton } from "./CatalogSkeleton";
import { CatalogFiltersClient } from "./CatalogFiltersClient";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "./MediaCard";

function mapToMediaItem(media: any): MediaItem {
  return {
    id: media.id,
    titulo: media.title,
    tipo: (media.type === "movie" ? "FILME" : media.type === "series" ? "SERIE" : media.type === "game" ? "GAME" : "LIVRO"),
    ano_lancamento: media.year,
    imagem_url: media.posterUrl,
    score: media.score?.consolidated ?? null,
  };
}

function CatalogContent() {
  const t = useTranslations("catalog");
  const sp = useSearchParams();
  const type = (sp.get("type") || undefined) as MediaType | undefined;
  const sort = sp.get("sort") || undefined;
  const query = sp.get("q") || undefined;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["catalog", { type, sort, query }],
    queryFn: () => getCatalog({ type, search: query, sort: sort as any }),
  });

  if (isLoading) return <CatalogSkeleton count={12} />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
        <svg className="w-14 h-14 text-red-500/60 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-gray-400 mb-4">{t("error")}</p>
        <Button onClick={() => refetch()}>{t("retry")}</Button>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
        <svg className="w-14 h-14 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-gray-400 mb-4">{t("noResults")}</p>
        <Button variant="outline" onClick={() => { window.location.href = window.location.pathname; }}>
          {t("clearFilters")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-gray-400 mb-4">{data.total} {t("title")}</p>
      <CatalogGrid medias={data.items.map(mapToMediaItem)} />
    </>
  );
}

export function CatalogPageClient() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <Suspense fallback={null}>
        <MobileFilterBar drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />
      </Suspense>
      <div className="flex-1 min-w-0">
        <Suspense fallback={<CatalogSkeleton count={12} />}>
          <CatalogContent />
        </Suspense>
      </div>
    </div>
  );
}

function MobileFilterBar({ drawerOpen, setDrawerOpen }: { drawerOpen: boolean; setDrawerOpen: (v: boolean) => void }) {
  const sp = useSearchParams();
  const activeCount = [...new URLSearchParams(sp.toString()).keys()].filter((k) => k !== "").length;

  return (
    <>
      <div className="lg:hidden flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
          Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </div>
      {drawerOpen && (
        <div className="fixed inset-0 z-drawer lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface-card shadow-floating p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-100 text-sm">Filtros</span>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-200 text-lg leading-none">&times;</button>
            </div>
            <CatalogFiltersClient />
          </div>
        </div>
      )}
    </>
  );
}
