import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { MovieDetailWrapper } from "@/components/MovieDetailWrapper";
import { generateDetailMetadata } from "@/lib/detail-metadata";
import { getMediaBySlug } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  return generateDetailMetadata({ locale, id, type: "movie" });
}

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const media = await getMediaBySlug(id);
  return <MovieDetailWrapper id={id} media={media} />;
}
