import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "@/components/ProtectedPage";
import { DiscoveriesContent } from "@/components/dashboard/DiscoveriesContent";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Descobertas — MEDIA Rate",
    alternates: {
      canonical: localizedUrl(locale, "/dashboard/discoveries"),
      languages: localizedAlternates("/dashboard/discoveries"),
    },
    robots: { index: false, follow: false },
  };
}

export default async function DiscoveriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <DiscoveriesContent />
    </ProtectedPage>
  );
}
