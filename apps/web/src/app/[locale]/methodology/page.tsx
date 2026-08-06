import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { StructuredData } from "@/components/StructuredData";
import { getInstitutionalContent } from "@/lib/institutional-content";
import { FONTES_ATIVAS, MIDIA_LABEL } from "@/lib/sources";
import { localeOpenGraph, localizedAlternates, localizedUrl } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getInstitutionalContent(locale).methodology;

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: {
      canonical: localizedUrl(locale, "/methodology"),
      languages: localizedAlternates("/methodology"),
    },
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: localizedUrl(locale, "/methodology"),
      siteName: "MEDIA Rate",
      locale: localeOpenGraph(locale),
      type: "article",
    },
    twitter: {
      card: "summary",
      title: copy.metaTitle,
      description: copy.metaDescription,
    },
    robots: { index: true, follow: true },
  };
}

export default async function MethodologyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getInstitutionalContent(locale).methodology;
  const pageUrl = localizedUrl(locale, "/methodology");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      "url": pageUrl,
      "name": copy.metaTitle,
      "description": copy.metaDescription,
      "inLanguage": locale,
      "isPartOf": { "@id": "https://media-rate-web.vercel.app/#website" },
      "about": { "@id": "https://media-rate-web.vercel.app/#organization" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": copy.faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": { "@type": "Answer", "text": faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "MEDIA Rate", "item": localizedUrl(locale) },
        { "@type": "ListItem", "position": 2, "name": copy.title, "item": pageUrl },
      ],
    },
  ];

  return (
    <article className="container mx-auto max-w-4xl px-4 py-12">
      <StructuredData data={jsonLd} />
      <header className="mb-10 text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{copy.lead}</p>
      </header>

      <div className="prose prose-invert max-w-none prose-headings:font-heading prose-a:text-primary">
        <section aria-labelledby="score-title">
          <h2 id="score-title">{copy.scoreTitle}</h2>
          <p>{copy.scoreBody}</p>
        </section>

        <section aria-labelledby="calculation-title">
          <h2 id="calculation-title">{copy.calculationTitle}</h2>
          <p>{copy.calculationLead}</p>
          <dl className="not-prose mt-6 grid gap-4 sm:grid-cols-3">
            {copy.calculationItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-surface-border/30 bg-[#11111E] p-5"
              >
                <dt className="font-heading text-lg font-semibold text-[#EDE7DC]">{item.label}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">{item.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="confidence-title">
          <h2 id="confidence-title">{copy.confidenceTitle}</h2>
          <p>{copy.confidenceBody}</p>
        </section>

        {/* Fontes ativas — fonte única de verdade (lib/sources.ts, D-209). */}
        <section aria-labelledby="sources-title">
          <h2 id="sources-title">{copy.sourceTitle}</h2>
          <p>{copy.sourceBody}</p>
          <ul className="not-prose mt-4 grid gap-2 sm:grid-cols-2">
            {FONTES_ATIVAS.map((fonte) => (
              <li
                key={fonte.id}
                className="flex items-center justify-between rounded-lg border border-surface-border/30 bg-[#11111E] px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-[#EDE7DC]">{fonte.nome}</span>
                <span className="text-xs text-[#9CA3AF]">
                  {fonte.tipo === "critica" ? "Crítica" : "Público"} ·{" "}
                  {fonte.midias.map((m) => MIDIA_LABEL[m]).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="scope-title">
          <h2 id="scope-title">{copy.scopeTitle}</h2>
          <p>{copy.scopeBody}</p>
        </section>

        <section aria-labelledby="faq-title">
          <h2 id="faq-title">{copy.faqTitle}</h2>
          <div className="not-prose mt-6 space-y-4">
            {copy.faqs.map((faq) => (
              <section
                key={faq.question}
                className="rounded-lg border border-surface-border/30 bg-[#11111E] p-5"
              >
                <h3 className="font-heading text-lg font-semibold text-[#EDE7DC]">
                  {faq.question}
                </h3>
                <p className="mt-2 leading-relaxed text-[#9CA3AF]">{faq.answer}</p>
              </section>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
