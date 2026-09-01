import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { StructuredData } from "@/components/StructuredData";
import { getInstitutionalContent } from "@/lib/institutional-content";
import { FONTES_ATIVAS, MIDIA_LABEL } from "@/lib/sources";
import type { MediaType } from "@/lib/types";

const TIPO_MATRIZ: MediaType[] = ["movie", "series", "game", "book", "comic", "manga"];
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

        <section aria-labelledby="coverage-matrix-title">
          <h2 id="coverage-matrix-title">{copy.coveragematrix}</h2>
          {/* Matriz de cobertura por categoria (fonte única: FONTES_ATIVAS +
              MIDIA_LABEL). Torna explícito quais categorias estão cobertas e
              quais estão em preparação — transparência do escopo real. */}
          <ul className="not-prose mt-6 grid gap-3 sm:grid-cols-2">
            {TIPO_MATRIZ.map((tipo) => {
              const fontes = FONTES_ATIVAS.filter((f) => f.midias.includes(tipo));
              const coberto = fontes.length > 0;
              return (
                <li
                  key={tipo}
                  data-testid={`coverage-${tipo}`}
                  className="rounded-lg border border-surface-border/30 bg-[#11111E] p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-base font-semibold text-[#EDE7DC]">
                      {MIDIA_LABEL[tipo]}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        coberto
                          ? "bg-[#34D399]/15 text-[#34D399]"
                          : "bg-[#F59E0B]/15 text-[#F59E0B]"
                      }`}
                    >
                      {coberto ? copy.covered : copy.inPreparation}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">
                    {coberto ? fontes.map((f) => f.nome).join(" · ") : copy.inPreparation}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="licensing-title">
          <h2 id="licensing-title">{copy.licensingTitle}</h2>
          <p>{copy.licensingBody}</p>
        </section>

        <section aria-labelledby="transparency-title">
          <h2 id="transparency-title">{copy.transparencyTitle}</h2>
          <p>{copy.transparencyBody}</p>
        </section>
      </div>
    </article>
  );
}
