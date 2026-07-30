import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Configurações — MEDIA Rate",
    description: "Gerencie suas preferências de conta.",
    alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/settings` },
    robots: { index: false, follow: false },
  };
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
