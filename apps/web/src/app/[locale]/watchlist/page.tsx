import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { WatchlistKanban } from "../../../components/WatchlistKanban";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Watchlist — MEDIA Rate", description: "Organize sua watchlist no MEDIA Rate." };
}

export default async function WatchlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-display font-bold text-gray-100 mb-8">Watchlist</h1>
      <WatchlistKanban />
    </div>
  );
}
