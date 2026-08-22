import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/lib/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import { localeOpenGraph, localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "@/lib/seo";
import { sanitizeHtml } from "@/lib/sanitize";

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

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header className="mb-16">
        <h1 className="font-heading text-4xl font-bold text-[#EDE7DC] tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg text-[#9CA3AF] leading-relaxed">{t("lead")}</p>
      </header>

      <div className="space-y-16">
        <ScrollReveal>
          <section>
            <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">
              {t("whatIsTitle")}
            </h2>
            <p className="text-[#9CA3AF] leading-relaxed">{t("whatIsBody")}</p>
          </section>
        </ScrollReveal>

        <section className="bg-[#11111E] border border-[#1C1C2E] rounded-lg p-8 -mx-2">
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">
            {t("whatIsNotTitle")}
          </h2>
          <p
            className="text-[#9CA3AF] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("whatIsNotBody")) }}
          />
          <p className="mt-4 text-sm text-[#818CF8]">
            <Link href="/methodology" className="underline underline-offset-2 hover:brightness-110">
              {t("whatIsNotCta")}
            </Link>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">
            {t("categoriesTitle")}
          </h2>
          <p
            className="text-[#9CA3AF] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("categoriesIntro")) }}
          />
          <ul className="mt-3 space-y-2 text-[#9CA3AF]">
            <li dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("categoriesMovie")) }} />
            <li dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("categoriesSeries")) }} />
            <li dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("categoriesGame")) }} />
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">
            {t("howItWorksTitle")}
          </h2>
          <p className="text-[#9CA3AF] leading-relaxed">{t("howItWorksBody")}</p>
          <p className="mt-4 text-sm text-[#818CF8]">
            <Link href="/methodology" className="underline underline-offset-2 hover:brightness-110">
              {t("howItWorksCta")}
            </Link>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">
            {t("transparencyTitle")}
          </h2>
          <p className="text-[#9CA3AF] leading-relaxed">{t("transparencyBody")}</p>
          <p className="mt-4 text-sm text-[#818CF8]">
            <Link href="/privacy" className="underline underline-offset-2 hover:brightness-110">
              {t("transparencyCta")}
            </Link>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">
            {t("languagesTitle")}
          </h2>
          <p className="text-[#9CA3AF] leading-relaxed">{t("languagesBody")}</p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-4">
            {t("roadmapTitle")}
          </h2>
          <p
            className="text-[#9CA3AF] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("roadmapBody")) }}
          />
          <p className="mt-3 text-xs text-[#6B7280]">
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
