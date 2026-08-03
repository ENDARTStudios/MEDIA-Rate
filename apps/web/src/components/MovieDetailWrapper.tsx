"use client";

import { MediaDetailPage } from "@/components/MediaDetailPage";
import { serializeJsonLd } from "@/lib/json-ld";
import type { Media } from "@/lib/types";

export function MovieDetailWrapper({ id, media }: { id: string; media: Media | null }) {
  const jsonLd = media && {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": media.title,
    "description": media.synopsis?.substring(0, 200),
    "image": media.posterUrl,
    "datePublished": String(media.year),
    "genre": media.genres?.slice(0, 3),
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
      <MediaDetailPage id={id} type="movie" />
    </>
  );
}
