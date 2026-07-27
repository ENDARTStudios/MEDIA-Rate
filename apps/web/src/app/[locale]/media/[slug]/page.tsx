import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMediaBySlug } from "../../../../lib/api";
import { MediaDetailClient } from "../../../../components/MediaDetailClient";

interface Props { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const media = await getMediaBySlug(slug);
  if (!media) return { title: "Mídia não encontrada — MEDIA Rate" };

  return {
    title: `${media.title} (${media.year}) — MEDIA Rate`,
    description: media.synopsis.slice(0, 160),
    alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/media/${slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${media.title} — MEDIA Rate`,
      description: media.synopsis.slice(0, 160),
      type: "article",
      images: media.posterUrl ? [{ url: media.posterUrl, width: 600, height: 900, alt: media.title }] : [],
      siteName: "MEDIA Rate",
    },
    twitter: { card: "summary_large_image", title: media.title, description: media.synopsis.slice(0, 160) },
  };
}

export default async function MediaDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const media = await getMediaBySlug(slug);
  if (!media) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MediaObject",
    name: media.title,
    description: media.synopsis,
    datePublished: String(media.year),
    genre: media.genres,
    image: media.posterUrl,
    ...(media.score && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: String(media.score.consolidated),
        bestRating: "100",
        reviewCount: media.score.sources.length,
      },
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MediaDetailClient slug={slug} />
    </>
  );
}
