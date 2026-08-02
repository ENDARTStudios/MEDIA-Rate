import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { localizedAlternates, localizedUrl } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/json-ld";
import { getInstitutionalContent } from "@/lib/institutional-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/faq"),
      languages: localizedAlternates("/faq"),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: t("metaOgTitle"),
      description: t("metaOgDescription"),
      siteName: "MEDIA Rate",
      type: "website",
    },
  };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getInstitutionalContent(locale);
  const { faqTitle, faqs } = content.methodology;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{faqTitle}</h1>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <section key={i} className="bg-[#11111E] border border-[#1C1C2E] rounded-lg p-6">
              <h2
                className="text-lg font-heading font-semibold text-[#EDE7DC] mb-3"
                itemProp="name"
              >
                {faq.question}
              </h2>
              <p className="text-[#9CA3AF] leading-relaxed text-sm">{faq.answer}</p>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
