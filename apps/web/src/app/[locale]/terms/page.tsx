import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { localeOpenGraph, localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "@/lib/seo";

/**
 * T306 (D-295) — Termos e Condições de Uso (v1.0, 13/08/2026).
 * SSR nos 3 locales com SEO (Open Graph + JSON-LD LegalDocument). Conteúdo
 * vindo de messages/<locale>.json, já sem os marcadores de revisão jurídica
 * (Operador: "Considere revisado com advogado").
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/terms"),
      languages: localizedAlternates("/terms"),
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: localizedUrl(locale, "/terms"),
      siteName: "MEDIA Rate",
      locale: localeOpenGraph(locale),
      type: "website",
      images: OG_IMAGE_PADRAO,
    },
    robots: { index: true, follow: true },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "terms" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LegalDocument",
    "name": t("h1"),
    "inLanguage": localeOpenGraph(locale),
    "dateModified": "2026-08-13",
    "isAccessibleForFree": true,
    "publisher": { "@type": "Organization", "name": "MEDIA Rate" },
  };
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{t("h1")}</h1>
      <p className="text-sm text-[#6B7280] mb-8">{t("lastUpdated")}</p>
      <div className="space-y-8 text-[#9CA3AF] leading-relaxed">
        {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
          <section key={n}>
            <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">
              {t("s" + n + "h")}
            </h2>
            <p className="whitespace-pre-line">{t("s" + n + "b")}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
