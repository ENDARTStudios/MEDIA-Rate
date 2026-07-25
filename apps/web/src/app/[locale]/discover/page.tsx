import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Descobrir — MEDIA Rate", description: "Descubra novas mídias no MEDIA Rate." };
}

export default async function DiscoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold text-gray-100 mb-4">Descobrir</h1>
      <p className="text-gray-400">Coleções curadas, recomendações IA e trending global aparecerão aqui.</p>
      <a href="/catalog" className="mt-6 inline-block px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors">{t("title")}</a>
    </div>
  );
}
