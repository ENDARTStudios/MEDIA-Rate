import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "@/components/ProtectedPage";
import { DashboardContent } from "@/components/DashboardContent";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Dashboard — MEDIA Rate",
    alternates: {
      canonical: localizedUrl(locale, "/dashboard"),
      languages: localizedAlternates("/dashboard"),
    },
    robots: { index: false, follow: false },
  };
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <DashboardContent />
    </ProtectedPage>
  );
}
