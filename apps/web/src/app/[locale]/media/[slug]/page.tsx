import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MediaDetailClient } from "@/components/MediaDetailClient";
import { StructuredData } from "@/components/StructuredData";
import { getMediaBySlug } from "@/lib/api";
import { isPreviewTipo } from "@/lib/api";
import { localeOpenGraph, localizedAlternates, localizedUrl } from "@/lib/seo";
import { titleForLocale, synopsisForLocale } from "@/lib/i18n-content";
import type { Media, MediaType } from "@/lib/types";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

const schemaTypeByMediaType: Record<MediaType, string> = {
  movie: "Movie",
  series: "TVSeries",
  game: "VideoGame",
  book: "Book",
  manga: "Book",
  comic: "Book",
};

function descriptionFor(media: Media, locale: string): string {
  return synopsisForLocale(media, locale).trim().slice(0, 160);
}

function mediaStructuredData(media: Media, locale: string, pageUrl: string) {
  const schemaType = schemaTypeByMediaType[media.type];

  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${pageUrl}#media`,
    "url": pageUrl,
    "name": titleForLocale(media, locale),
    "description": synopsisForLocale(media, locale),
    "inLanguage": locale,
    "genre": media.genres,
    ...(media.posterUrl ? { image: media.posterUrl } : {}),
    ...(media.year ? { copyrightYear: media.year } : {}),
    "mainEntityOfPage": pageUrl,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const media = await getMediaBySlug(slug);

  if (!media) {
    return {
      title: "Mídia não encontrada — MEDIA Rate",
      robots: { index: false, follow: false },
    };
  }

  const pageUrl = localizedUrl(locale, `/media/${media.slug}`);
  const description = descriptionFor(media, locale);
  const tituloLocal = titleForLocale(media, locale);
  const title = `${tituloLocal} (${media.year}) — MEDIA Rate`;
  const emPreparacao = isPreviewTipo(media.type);

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: localizedAlternates(`/media/${media.slug}`),
    },
    robots: emPreparacao ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "article",
      locale: localeOpenGraph(locale),
      images: media.posterUrl
        ? [{ url: media.posterUrl, width: 600, height: 900, alt: tituloLocal }]
        : [],
      siteName: "MEDIA Rate",
    },
    twitter: {
      card: media.posterUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: media.posterUrl ? [media.posterUrl] : [],
    },
  };
}

export default async function MediaDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const media = await getMediaBySlug(slug);
  if (!media) notFound();

  const pageUrl = localizedUrl(locale, `/media/${media.slug}`);
  const jsonLd = [
    mediaStructuredData(media, locale, pageUrl),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "MEDIA Rate", "item": localizedUrl(locale) },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Catalog",
          "item": localizedUrl(locale, "/catalog"),
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": titleForLocale(media, locale),
          "item": pageUrl,
        },
      ],
    },
  ];

  return (
    <>
      <StructuredData data={jsonLd} />
      <MediaDetailClient slug={slug} initialData={media} />
    </>
  );
}
