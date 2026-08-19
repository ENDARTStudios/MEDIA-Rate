import type { Metadata } from "next";
import { getMediaBySlug } from "@/lib/api";
import { titleForLocale } from "@/lib/i18n-content";
import { synopsisForLocale } from "@/lib/i18n-content";
import { siteUrl } from "@/lib/seo";

type MediaType = "movie" | "tv" | "game";

const SCHEMA_TYPES: Record<MediaType, string> = {
  movie: "Movie",
  tv: "TVSeries",
  game: "VideoGame",
};

// NOTE: openGraph type "video.game" is not valid per spec; use "video.other"
type OGType = "video.movie" | "video.tv_show" | "video.other" | "website";

const OG_TYPES: Record<MediaType, OGType> = {
  movie: "video.movie",
  tv: "video.tv_show",
  game: "video.other",
};

const SITE_URL = siteUrl;

export async function generateDetailMetadata({
  locale,
  id,
  type,
}: {
  locale: string;
  id: string;
  type: MediaType;
}): Promise<Metadata> {
  const media = await getMediaBySlug(id);

  if (!media) {
    return {
      title: "Mídia não encontrada — MEDIA Rate",
      alternates: { canonical: `${SITE_URL}/${locale}/${type}/${id}` },
    };
  }

  const schemaType = SCHEMA_TYPES[type];
  const ogType = OG_TYPES[type];
  const canonicalUrl = `${SITE_URL}/${locale}/${type}/${id}`;
  const locales = ["pt-BR", "en-US", "es-ES"] as const;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "name": titleForLocale(media, locale),
    "description": media.synopsis,
    "image": media.posterUrl,
    "datePublished": String(media.year),
    "genre": media.genres,
  };

  if (media.score) {
    // T337: `consolidated` é 0–100 e `bestRating` é 10 → dividir UMA vez por 10.
    // (bug anterior dividia duas vezes: 85 → "0.9" em vez de "8.5").
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": (media.score.consolidated / 10).toFixed(1),
      "bestRating": "10",
      "ratingCount": media.score.sources?.length ?? 1,
    };
  }

  // T337 (follow-up): numberOfSeasons/numberOfEpisodes eram HARDCODED (3/26)
  // para toda série — dado falso de SEO. Omitido até a API expor os totais
  // reais (temporada/episódio, T288).
  if (type === "game") {
    jsonLd.gamePlatform = media.streaming.map((s) => s.name);
  }

  return {
    title: `${titleForLocale(media, locale)} — MEDIA Rate`,
    description: synopsisForLocale(media, locale).substring(0, 160),
    alternates: {
      canonical: canonicalUrl,
      languages: Object.fromEntries([
        ["x-default", `${SITE_URL}/pt-BR/${type}/${id}`],
        ...locales.map((l) => [l, `${SITE_URL}/${l}/${type}/${id}`]),
      ]),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: titleForLocale(media, locale),
      description: synopsisForLocale(media, locale).substring(0, 160),
      images: media.posterUrl ? [{ url: media.posterUrl }] : [],
      url: canonicalUrl,
      locale: locale === "pt-BR" ? "pt_BR" : locale === "en-US" ? "en_US" : "es_ES",
      type: ogType,
      siteName: "MEDIA Rate",
    },
    other: {
      "application/ld+json": JSON.stringify(jsonLd),
    },
  };
}
