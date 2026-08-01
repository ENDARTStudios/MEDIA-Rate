import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: localizedUrl(locale, "/privacy"), languages: localizedAlternates("/privacy") },
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "privacy" });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{t("h1")}</h1>
      <p className="text-sm text-[#6B7280] mb-8">{t("lastUpdated")}</p>
      <div className="space-y-8 text-[#9CA3AF] leading-relaxed">
        {[1,2,3,4,5,6,7,8].map((n) => (
          <section key={n}>
            <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">{t("s" + n + "h")}</h2>
            <p className="whitespace-pre-line">{t("s" + n + "b")}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
