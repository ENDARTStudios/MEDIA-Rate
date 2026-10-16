import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StructuredData } from "@/components/StructuredData";
import { getInstitutionalContent } from "@/lib/institutional-content";
import { FONTES_ATIVAS, MIDIA_LABEL_KEY } from "@/lib/sources";
import { ScrollReveal } from "@/components/ScrollReveal";
import { localeOpenGraph, localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "@/lib/seo";

/**
 * D-590 (T211) — opt-in de renderização estática para conteúdo institucional.
 *
 * Estas seis páginas são conteúdo editorial (sem dado de usuário, sem cookie, sem
 * `searchParams`): podem ser pré-renderizadas e servidas por CDN. Hoje **todas as
 * rotas do app são dinâmicas por padrão** (ver D-589: o `force-static` é o único
 * caminho que produz `○` no build), então o opt-in é explícito.
 *
 * `revalidate = 3600`: o conteúdo muda quando alguém edita as mensagens/fontes —
 * uma hora de defasagem é aceitável para texto institucional, e o endpoint
 * `/api/revalidate` (já existente) permite invalidação sob demanda em publicação.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

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

export default async function MethodologyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getInstitutionalContent(locale).methodology;
  const pageUrl = localizedUrl(locale, "/methodology");
  // T211: rótulos de tipo de mídia e de bucket vinham hardcoded em pt-BR e
  // apareciam em en-US/es-ES. Agora usam as chaves canônicas traduzidas.
  const tCat = await getTranslations("catalog");
  const tScore = await getTranslations("scoredial");

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
      "about": { "@id": "https://mediarate.app/#organization" },
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
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-fg-primary mb-8">
          {copy.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{copy.lead}</p>
      </header>

      {/* T211: `prose` era inerte (plugin de typography ausente) → estilos explícitos por token. */}
      <div className="max-w-[34rem] space-y-12 [&_a]:text-[#818CF8] [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-[#F5F5F7] [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-[#A0A0B8]">
        <ScrollReveal>
          <section aria-labelledby="score-title">
            <h2 id="score-title">{copy.scoreTitle}</h2>
            <p>{copy.scoreBody}</p>
          </section>
        </ScrollReveal>

        <section aria-labelledby="calculation-title">
          <h2 id="calculation-title">{copy.calculationTitle}</h2>
          <p>{copy.calculationLead}</p>
          <dl className="not-prose mt-6 grid gap-4 sm:grid-cols-3">
            {copy.calculationItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-surface-border/30 bg-[#12121C] p-5"
              >
                <dt className="font-heading text-lg font-semibold text-[#F5F5F7]">{item.label}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[#A0A0B8]">{item.body}</dd>
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
          <ul role="list" className="not-prose mt-4 grid gap-2 sm:grid-cols-2">
            {FONTES_ATIVAS.map((fonte) => (
              <li
                key={fonte.id}
                className="flex items-center justify-between rounded-lg border border-surface-border/30 bg-[#12121C] px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-[#F5F5F7]">{fonte.nome}</span>
                <span className="text-xs text-[#A0A0B8]">
                  {fonte.tipo === "critica" ? tScore("critic") : tScore("audience")} ·{" "}
                  {fonte.midias.map((m) => tCat(MIDIA_LABEL_KEY[m])).join(" · ")}
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
                className="rounded-lg border border-surface-border/30 bg-[#12121C] p-5"
              >
                <h3 className="font-heading text-lg font-semibold text-[#F5F5F7]">
                  {faq.question}
                </h3>
                <p className="mt-2 leading-relaxed text-[#A0A0B8]">{faq.answer}</p>
              </section>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
