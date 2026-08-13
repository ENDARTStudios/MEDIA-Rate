import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Watchlist — MEDIA Rate",
    description: "Sua lista de mídias para assistir e jogar.",
    alternates: { canonical: `https://mediarate.app/${locale}/watchlist` },
    robots: { index: false, follow: false },
  };
}

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
