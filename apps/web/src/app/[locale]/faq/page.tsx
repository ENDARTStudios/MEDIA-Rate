import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/json-ld";
import { HomeContentSections } from "@/components/HomeContentSections";
import { getInstitutionalContent } from "@/lib/institutional-content";

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
      images: OG_IMAGE_PADRAO,
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
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-fg-primary mb-8">
          {faqTitle}
        </h1>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <section
              key={i}
              className="bg-surface-card border border-surface-border rounded-lg p-6"
            >
              <h2
                className="text-lg font-heading font-semibold text-fg-primary mb-3"
                itemProp="name"
              >
                {faq.question}
              </h2>
              <p className="text-fg-secondary leading-relaxed text-sm">{faq.answer}</p>
            </section>
          ))}
        </div>
        {/* D-657: as secoes de conteudo que esticavam a home (~8k px) vivem aqui, em rota
            propria e indexavel, como pedido (opcao 2). A home volta a ser vitrine. */}
        <div className="mt-16 border-t border-surface-border pt-12">
          <HomeContentSections locale={locale} />
        </div>
      </div>
    </>
  );
}
