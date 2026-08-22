import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { DashboardClient } from "../../../components/dashboard/DashboardClient";
import { PlanCelebration } from "../../../components/ui/PlanCelebration";
import { localizedAlternates, localizedUrl } from "../../../lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    // T406: alternates (hreflang) — página privada, mas contrato de metadata
    // consistente; robots mantém noindex.
    alternates: {
      canonical: localizedUrl(locale, "/dashboard"),
      languages: localizedAlternates("/dashboard"),
    },
    robots: { index: false, follow: true },
  };
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* T388: faixa de identidade do plano (cor via --plan-accent do provider). */}
      <div
        className="mb-6 h-1 w-24 rounded-full"
        style={{ backgroundColor: "var(--plan-accent, #818CF8)" }}
        aria-hidden="true"
      />
      <h1 className="text-3xl font-bold mb-2 text-[#EDE7DC]">{t("title")}</h1>
      <p className="text-[#9CA3AF] mb-6 max-w-2xl">{t("subtitle")}</p>
      <DashboardClient />
      <PlanCelebration />
    </div>
  );
}
