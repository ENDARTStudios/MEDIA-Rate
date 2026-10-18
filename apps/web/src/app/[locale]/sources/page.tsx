import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StructuredData } from "@/components/StructuredData";
import { getInstitutionalContent } from "@/lib/institutional-content";
import { FONTES_ATIVAS, MIDIA_LABEL_KEY } from "@/lib/sources";
import type { MediaType } from "@/lib/types";

const TIPO_MATRIZ: MediaType[] = ["movie", "series", "game", "book", "comic", "manga"];
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
  // T211: rótulos de tipo de mídia e de bucket (crítica/público) vinham
  // hardcoded em pt-BR e apareciam em en-US/es-ES. Agora usam as chaves
  // canônicas já traduzidas nos 3 locales.
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
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <StructuredData data={jsonLd} />
      <header className="mb-10 text-center">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-fg-primary mb-8">
          {copy.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{copy.lead}</p>
      </header>

      {/* T211: `prose prose-invert` era INERTE (o plugin @tailwindcss/typography
          não está instalado) — títulos saíam no default do browser e links no azul
          nativo sobre fundo escuro. Estilos agora explícitos pelos tokens. */}
      <div className="max-w-[34rem] space-y-12 [&_a]:text-accent-indigo [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-fg-primary [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-fg-secondary">
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
                className="rounded-lg border border-surface-border/30 bg-surface-card p-5"
              >
                <dt className="font-heading text-lg font-semibold text-fg-primary">{fonte.nome}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-fg-secondary">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      fonte.tipo === "critica"
                        ? "bg-accent-sky/15 text-accent-sky"
                        : "bg-brand/15 text-brand"
                    }`}
                  >
                    {fonte.tipo === "critica" ? tScore("critic") : tScore("audience")}
                  </span>{" "}
                  {fonte.midias.map((m) => tCat(MIDIA_LABEL_KEY[m])).join(" · ")}
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
          <ul role="list" className="not-prose mt-6 grid gap-3 sm:grid-cols-2">
            {TIPO_MATRIZ.map((tipo) => {
              const fontes = FONTES_ATIVAS.filter((f) => f.midias.includes(tipo));
              const coberto = fontes.length > 0;
              return (
                <li
                  key={tipo}
                  data-testid={`coverage-${tipo}`}
                  className="rounded-lg border border-surface-border/30 bg-surface-card p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-base font-semibold text-fg-primary">
                      {tCat(MIDIA_LABEL_KEY[tipo])}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        coberto
                          ? "bg-accent-emerald/15 text-accent-emerald"
                          : "bg-score-6/15 text-score-6"
                      }`}
                    >
                      {coberto ? copy.covered : copy.inPreparation}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
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
