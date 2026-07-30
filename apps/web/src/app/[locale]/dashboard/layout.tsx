import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Dashboard — MEDIA Rate",
    description: "Seu painel de controle. Watchlist, favoritos e estatísticas.",
    alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/dashboard` },
    robots: { index: false, follow: false },
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
