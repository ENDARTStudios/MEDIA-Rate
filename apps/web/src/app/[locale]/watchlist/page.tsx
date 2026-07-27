import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "@/components/ProtectedPage";
import { WatchlistClient } from "@/components/WatchlistClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Watchlist — MEDIA Rate", description: "Organize sua watchlist no MEDIA Rate." };
}

export default async function WatchlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ProtectedPage>
      <WatchlistClient />
    </ProtectedPage>
  );
}
