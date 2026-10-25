import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "@/components/ProtectedPage";

// T412 (D-390): página autenticada — nunca em cache ISR/CDN.
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { WatchlistClient } from "@/components/WatchlistClient";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Watchlist — MEDIA Rate",
    alternates: {
      canonical: localizedUrl(locale, "/watchlist"),
      languages: localizedAlternates("/watchlist"),
    },
    robots: { index: false, follow: false },
  };
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
