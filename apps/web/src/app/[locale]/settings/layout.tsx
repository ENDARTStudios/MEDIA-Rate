import type { Metadata } from "next";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Configurações — MEDIA Rate",
    alternates: {
      canonical: localizedUrl(locale, "/settings"),
      languages: localizedAlternates("/settings"),
    },
    robots: { index: false, follow: false },
  };
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
