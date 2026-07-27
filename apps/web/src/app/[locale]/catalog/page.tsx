import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { CatalogPageClient } from "../../../components/CatalogPageClient";
import { getCatalogSync } from "../../../lib/api";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Catálogo — MEDIA Rate", description: "Explore filmes, séries, games e livros no MEDIA Rate." };
}

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  const initialData = getCatalogSync({ page: 1, limit: 12 });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-[#EDE7DC]">{t("title")}</h1>
      <CatalogPageClient initialData={initialData} />
    </div>
  );
}
