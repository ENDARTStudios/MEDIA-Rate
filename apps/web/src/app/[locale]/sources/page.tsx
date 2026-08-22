import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { StructuredData } from "@/components/StructuredData";
import { getInstitutionalContent } from "@/lib/institutional-content";
import { FONTES_ATIVAS, MIDIA_LABEL } from "@/lib/sources";
import { localeOpenGraph, localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getInstitutionalContent(locale).sources;

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: {
      canonical: localizedUrl(locale, "/sources"),
      languages: localizedAlternates("/sources"),
    },
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: localizedUrl(locale, "/sources"),
      siteName: "MEDIA Rate",
      locale: localeOpenGraph(locale),
      type: "article",
      images: OG_IMAGE_PADRAO,
    },
    twitter: {
      card: "summary",
      title: copy.metaTitle,
      description: copy.metaDescription,
    },
    robots: { index: true, follow: true },
  };
}

export default async function SourcesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getInstitutionalContent(locale).sources;
  const pageUrl = localizedUrl(locale, "/sources");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      "url": pageUrl,
      "name": copy.metaTitle,
      "description": copy.metaDescription,
      "inLanguage": locale,
      "isPartOf": { "@id": "https://mediarate.app/#website" },
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
        <section aria-labelledby="coverage-title">
          <h2 id="coverage-title">{copy.coverageTitle}</h2>
          <p>{copy.coverageBody}</p>
        </section>

        <section aria-labelledby="supported-sources-title">
          <h2 id="supported-sources-title">{copy.sourceTitle}</h2>
          {/* Fonte única de verdade: FONTES_ATIVAS (lib/sources.ts, D-209).
              Cada fonte mostra tipo (crítica/público) + mídias cobertas. */}
          <dl className="not-prose mt-6 grid gap-4 sm:grid-cols-2">
            {FONTES_ATIVAS.map((fonte) => (
              <div
                key={fonte.id}
                className="rounded-lg border border-surface-border/30 bg-[#11111E] p-5"
              >
                <dt className="font-heading text-lg font-semibold text-[#EDE7DC]">{fonte.nome}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      fonte.tipo === "critica"
                        ? "bg-[#38BDF8]/15 text-[#38BDF8]"
                        : "bg-[#E11D48]/15 text-[#E11D48]"
                    }`}
                  >
                    {fonte.tipo === "critica" ? "Crítica" : "Público"}
                  </span>{" "}
                  {fonte.midias.map((m) => MIDIA_LABEL[m]).join(" · ")}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="transparency-title">
          <h2 id="transparency-title">{copy.transparencyTitle}</h2>
          <p>{copy.transparencyBody}</p>
        </section>
      </div>
    </article>
  );
}
