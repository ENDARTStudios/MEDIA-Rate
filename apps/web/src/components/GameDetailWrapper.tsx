"use client";

import { useLocale } from "next-intl";
import { MediaDetailPage } from "@/components/MediaDetailPage";
import { serializeJsonLd } from "@/lib/json-ld";
import { titleForLocale, synopsisForLocale } from "@/lib/i18n-content";
import type { Media, StreamingService } from "@/lib/types";

export function GameDetailWrapper({ id, media }: { id: string; media: Media | null }) {
  const locale = useLocale();
  const jsonLd = media && {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": titleForLocale(media, locale),
    "description": synopsisForLocale(media, locale).slice(0, 200),
    "image": media.posterUrl,
    "datePublished": String(media.year),
    "genre": media.genres?.slice(0, 3),
    "gamePlatform": media.streaming?.map((s: StreamingService) => s.name) ?? [],
    "aggregateRating": media.score
      ? {
          "@type": "AggregateRating",
          "ratingValue": (Math.round(media.score.consolidated / 10) / 10).toFixed(1),
          "bestRating": "10",
          "ratingCount": media.score.sources?.length ?? 1,
        }
      : undefined,
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
      <MediaDetailPage id={id} type="game" />
    </>
  );
}
