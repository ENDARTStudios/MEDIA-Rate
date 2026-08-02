import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { DiscoverClient } from "../../../components/DiscoverClient";
import { getCatalogSync } from "../../../lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Descobrir — MEDIA Rate",
    description: "Descubra novas mídias no MEDIA Rate.",
    alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/discover` },
    robots: { index: true, follow: true },
  };
}

export default async function DiscoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  const initialData = getCatalogSync({ page: 1, limit: 10, sort: "score" });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2 text-[#EDE7DC]">Descobrir</h1>
      <p className="text-[#9CA3AF] mb-6">
        Mídias em destaque com maiores MEDIA Scores.{" "}
        <a href="/catalog" className="text-[#818CF8] hover:text-[#A5B4FC] underline">
          {t("title")} completo
        </a>
      </p>
      <DiscoverClient initialData={initialData} />
    </div>
  );
}
