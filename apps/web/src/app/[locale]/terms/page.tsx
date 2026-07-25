import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Termos de Uso — MEDIA Rate" };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("footer");

  return (
    <div className="min-h-[calc(100vh-8rem)] max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">{t("terms")}</h1>
      <p className="text-gray-400">Página de termos de uso em construção.</p>
    </div>
  );
}
