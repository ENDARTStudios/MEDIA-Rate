import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/lib/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import { localeOpenGraph, localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "@/lib/seo";
import { sanitizeHtml } from "@/lib/sanitize";

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
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/about"),
      languages: localizedAlternates("/about"),
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: localizedUrl(locale, "/about"),
      siteName: "MEDIA Rate",
      locale: localeOpenGraph(locale),
      type: "website",
      images: OG_IMAGE_PADRAO,
    },
    robots: { index: true, follow: true },
  };
}

/**
 * D-587 (T211): as mensagens do `/about` usam a tag `<strong>` e eram renderizadas
 * com `sanitizeHtml(t.markup("chave", MARKUP_STRONG))`. Sem passar o handler da tag, cada chamada fazia o
 * next-intl registrar `FORMATTING_ERROR` no servidor — 9 erros por render de uma
 * página pública (ruído em log e no Sentry), com o HTML saindo por fallback.
 * `t.markup()` é a API correta para mensagem com tag renderizada como string.
 */
const MARKUP_STRONG = { strong: (chunks: string) => `<strong>${chunks}</strong>` };

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header className="mb-16">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-fg-primary mb-8">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-[34rem] text-lg text-[#A0A0B8] leading-relaxed">{t("lead")}</p>
      </header>

      <div className="space-y-16">
        <ScrollReveal>
          <section>
            <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-4">
              {t("whatIsTitle")}
            </h2>
            <p className="max-w-[38rem] text-[#A0A0B8] leading-relaxed">{t("whatIsBody")}</p>
          </section>
        </ScrollReveal>

        <section className="bg-[#12121C] border border-[#1C1C2E] rounded-lg p-8 -mx-2">
          <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-4">
            {t("whatIsNotTitle")}
          </h2>
          <p
            className="max-w-[38rem] text-[#A0A0B8] leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(t.markup("whatIsNotBody", MARKUP_STRONG)),
            }}
          />
          <p className="mt-4 text-sm text-[#818CF8]">
            <Link href="/methodology" className="underline underline-offset-2 hover:brightness-110">
              {t("whatIsNotCta")}
            </Link>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-4">
            {t("categoriesTitle")}
          </h2>
          <p
            className="max-w-[38rem] text-[#A0A0B8] leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(t.markup("categoriesIntro", MARKUP_STRONG)),
            }}
          />
          <ul role="list" className="mt-3 space-y-2 text-[#A0A0B8]">
            <li
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(t.markup("categoriesMovie", MARKUP_STRONG)),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(t.markup("categoriesSeries", MARKUP_STRONG)),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(t.markup("categoriesGame", MARKUP_STRONG)),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(t.markup("categoriesBook", MARKUP_STRONG)),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(t.markup("categoriesComic", MARKUP_STRONG)),
              }}
            />
            <li
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(t.markup("categoriesManga", MARKUP_STRONG)),
              }}
            />
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-4">
            {t("howItWorksTitle")}
          </h2>
          <p className="max-w-[38rem] text-[#A0A0B8] leading-relaxed">{t("howItWorksBody")}</p>
          <p className="mt-4 text-sm text-[#818CF8]">
            <Link href="/methodology" className="underline underline-offset-2 hover:brightness-110">
              {t("howItWorksCta")}
            </Link>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-4">
            {t("transparencyTitle")}
          </h2>
          <p className="max-w-[38rem] text-[#A0A0B8] leading-relaxed">{t("transparencyBody")}</p>
          <p className="mt-4 text-sm text-[#818CF8]">
            <Link href="/privacy" className="underline underline-offset-2 hover:brightness-110">
              {t("transparencyCta")}
            </Link>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-4">
            {t("languagesTitle")}
          </h2>
          <p className="max-w-[38rem] text-[#A0A0B8] leading-relaxed">{t("languagesBody")}</p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-4">
            {t("roadmapTitle")}
          </h2>
          <p
            className="max-w-[38rem] text-[#A0A0B8] leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(t.markup("roadmapBody", MARKUP_STRONG)),
            }}
          />
          <p className="mt-3 text-xs text-[#A0A0B8]">
            {t("availableIn")}{" "}
            <Link href="/about" locale="en-US" className="text-[#818CF8] underline">
              {t("enLabel")}
            </Link>{" "}
            {t("and")}{" "}
            <Link href="/about" locale="es-ES" className="text-[#818CF8] underline">
              {t("esLabel")}
            </Link>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
