"use client";

import dynamic from "next/dynamic";
import { MediaDetailPage } from "@/components/MediaDetailPage";
import { getMediaBySlug } from "@/lib/api";
import { serializeJsonLd } from "@/lib/json-ld";
import type { Media } from "@/lib/types";

const Seasons = dynamic(
  () => import("@/components/Seasons").then((m) => ({ default: m.Seasons })),
  { ssr: false },
);
const Episodes = dynamic(
  () => import("@/components/Episodes").then((m) => ({ default: m.Episodes })),
  { ssr: false },
);

export function TVDetailWrapper({ id }: { id: string }) {
  const media = getMediaBySlug(id) as unknown as Media | null;
  const jsonLd = media && {
    "@context": "https://schema.org",
    "@type": "TVSeries",
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
    "numberOfSeasons": 3,
    "numberOfEpisodes": 26,
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
      <MediaDetailPage id={id} type="tv">
        <div className="space-y-6 mt-8">
          <Seasons
            seasons={[
              { number: 1, title: "Temporada 1", episodeCount: 10, score: 85 },
              { number: 2, title: "Temporada 2", episodeCount: 10, score: 88 },
              { number: 3, title: "Temporada 3", episodeCount: 8, score: 82 },
            ]}
            activeSeason={1}
          />
          <Episodes
            seasonNumber={1}
            episodes={[
              {
                number: 1,
                title: "Episódio 1",
                synopsis: "O início da jornada.",
                score: 82,
                runtime: "45min",
              },
              {
                number: 2,
                title: "Episódio 2",
                synopsis: "A descoberta inesperada.",
                score: 79,
                runtime: "42min",
              },
              {
                number: 3,
                title: "Episódio 3",
                synopsis: "O confronto inevitável.",
                score: 91,
                runtime: "48min",
              },
            ]}
          />
        </div>
      </MediaDetailPage>
    </>
  );
}
