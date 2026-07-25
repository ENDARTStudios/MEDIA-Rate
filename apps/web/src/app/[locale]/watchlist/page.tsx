import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Watchlist — MEDIA Rate", description: "Sua watchlist no MEDIA Rate." };
}

export default async function WatchlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold text-gray-100 mb-4">Watchlist</h1>
      <p className="text-gray-400">Sua watchlist Kanban será exibida aqui. Organize por "Quero ver", "Assistindo", "Completo" e "Abandonado".</p>
    </div>
  );
}
