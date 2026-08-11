import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
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
    alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/discoveries` },
    robots: { index: false, follow: true },
  };
}

export default async function DiscoveriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("discoveries");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2 text-[#EDE7DC]">{t("title")}</h1>
      <p className="text-[#9CA3AF] mb-6 max-w-2xl">{t("subtitle")}</p>
      <DiscoveriesFeed />
    </div>
  );
}
