"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getCatalog } from "@/lib/api";
import type { CatalogResponse } from "@/lib/types";
import { CatalogGrid } from "./CatalogGrid";
import { CatalogSkeleton } from "./CatalogSkeleton";
import type { MediaItem } from "./MediaCard";
import { RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";
import { ErrorState } from "@/components/ui/error-state";

function mapToMediaItem(media: any): MediaItem {
  return {
    id: media.id,
    titulo: media.title,
    tipo: (media.type === "movie" ? "FILME" : media.type === "series" ? "SERIE" : media.type === "game" ? "GAME" : media.type === "anime" ? "ANIME" : media.type === "comic" ? "COMIC" : "LIVRO"),
    ano_lancamento: media.year,
    imagem_url: media.posterUrl,
    score: media.score?.consolidated ?? null,
  };
}

export function DiscoverClient({ initialData }: { initialData?: CatalogResponse }) {
  const t = useTranslations("discover");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["discover"],
    queryFn: () => getCatalog({ page: 1, limit: 10, sort: "score" }),
    initialData,
    staleTime: 60 * 1000,
  });

  if (isLoading && !data) {
    return <CatalogSkeleton count={10} />;
  }

  if (error instanceof RateLimitedError) {
    return <RateLimited retryAfterSeconds={error.retryAfterSeconds} onRetry={() => refetch()} />;
  }

  if (error && !data) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
        <p className="text-[#9CA3AF]">{t("empty")}</p>
        <a href="/catalog" className="mt-4 inline-block px-6 py-2 bg-[#818CF8] text-[#0F172A] rounded-lg hover:brightness-110 transition-colors">{t("cta")}</a>
      </div>
    );
  }

  return <CatalogGrid medias={data.items.map(mapToMediaItem)} />;
}
