import { setRequestLocale } from "next-intl/server";
import { MovieDetailWrapper } from "@/components/MovieDetailWrapper";

export default async function MovieDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <MovieDetailWrapper id={id} />;
}
