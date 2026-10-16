import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/** D-584 (T211): título e corpo estavam hardcoded em pt-BR (vazavam em EN/ES). */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "assistant" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function AssistantPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "assistant" });
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 font-heading text-2xl font-bold text-[#F5F5F7]">{t("title")}</h1>
      <p className="text-[#A0A0B8]">{t("body")}</p>
    </div>
  );
}
