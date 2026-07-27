import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { DiscoverClient } from "../../../components/DiscoverClient";
import { getCatalogSync } from "../../../lib/api";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Descobrir — MEDIA Rate", description: "Descubra novas mídias no MEDIA Rate." };
}

export default async function DiscoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  const initialData = getCatalogSync({ page: 1, limit: 10, sort: "score" });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2 text-gray-100">Descobrir</h1>
      <p className="text-gray-400 mb-6">Mídias em destaque com maiores MEDIA Scores. <a href="/catalog" className="text-accent-400 hover:text-accent-300 underline">{t("title")} completo</a></p>
      <DiscoverClient initialData={initialData} />
    </div>
  );
}
