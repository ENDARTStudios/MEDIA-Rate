import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Assistente IA — MEDIA Rate" };
}

export default async function AssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold text-gray-100 mb-4">Assistente IA</h1>
      <p className="text-gray-400">Recomendações personalizadas via inteligência artificial. Diga o que você gosta e receba sugestões.</p>
    </div>
  );
}
