"use client";

import { MediaDetailPage } from "@/components/MediaDetailPage";
import { getMediaBySlug } from "@/lib/api";
import { serializeJsonLd } from "@/lib/sanitize";

export function MovieDetailWrapper({ id }: { id: string }) {
  const media = getMediaBySlug(id) as any; // sync read for metadata
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
