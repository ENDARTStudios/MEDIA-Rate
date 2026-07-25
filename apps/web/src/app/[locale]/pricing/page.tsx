import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Planos — MEDIA Rate", description: "Escolha o plano ideal para você." };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  return (
    <div className="min-h-[calc(100vh-8rem)] py-16 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-100 mb-4">{t("pricing")}</h1>
        <p className="text-gray-400">Página de planos em construção.</p>
      </div>
    </div>
  );
}
