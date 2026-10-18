"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getCatalog } from "@/lib/api";
import type { CatalogResponse, Media } from "@/lib/types";
import { CatalogGrid } from "./CatalogGrid";
import { CatalogSkeleton } from "./CatalogSkeleton";
import type { MediaItem } from "./MediaCard";
import { RateLimitedError } from "@/lib/http";
import { Link } from "@/lib/navigation";
import { RateLimited } from "@/components/ui/rate-limited";
import { ErrorState } from "@/components/ui/error-state";

function mapToMediaItem(media: Media): MediaItem {
  return {
    id: media.id,
    titulo: media.title,
    // T414: título EN da cadeia D-369 (evita PT em /en-US).
    titulo_original: media.titleLocalized?.en ?? media.title,
    slug: media.slug,
    tipo:
      media.type === "movie"
        ? "FILME"
        : media.type === "series"
          ? "SERIE"
          : media.type === "game"
            ? "GAME"
            : media.type === "manga"
              ? "MANGA"
              : media.type === "comic"
                ? "COMIC"
                : "LIVRO",
    ano_lancamento: media.year,
    imagem_url: media.posterUrl,
    score: media.score?.consolidated ?? null,
    preview: media.preview,
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
        <p className="text-fg-secondary">{t("empty")}</p>
        <Link
          href="/catalog"
          className="mt-4 inline-block rounded-lg bg-accent-indigo px-6 py-2 text-accent-indigo-foreground transition-colors hover:brightness-110"
        >
          {t("cta")}
        </Link>
      </div>
    );
  }

  return <CatalogGrid medias={data.items.map(mapToMediaItem)} />;
}
