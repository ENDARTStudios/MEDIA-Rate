import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PageShell } from "@/components/ui/page-shell";
import { DiscoveriesFeed } from "../../../components/DiscoveriesFeed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "discoveries" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `https://mediarate.app/${locale}/discoveries` },
    robots: { index: false, follow: true },
  };
}

export default async function DiscoveriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("discoveries");

  return (
    <PageShell title={t("title")} intro={t("subtitle")}>
      <DiscoveriesFeed />
    </PageShell>
  );
}
