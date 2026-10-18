import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/lib/navigation";
import { localeOpenGraph, localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "@/lib/seo";

/**
 * D-622 (T211) — página de Direitos do Titular (A CRIAR).
 *
 * A política já citava os direitos; faltava a superfície que explica **como exercer**, **em
 * quanto tempo** e **para quem reclamar**. Tudo ancorado no que o produto faz:
 * `LgpdControls` exporta via `GET /api/v1/user/data` (arquivo para download) e exclui via
 * `DELETE /api/v1/user/data` (202) com confirmação em dois passos; `/settings` é onde isso vive.
 *
 * O canal do encarregado é o **contato institucional já público no rodapé** — a página não
 * inventa endereço novo. O prazo citado é o da própria LGPD.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rightsPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/direitos-do-titular"),
      languages: localizedAlternates("/direitos-do-titular"),
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: localizedUrl(locale, "/direitos-do-titular"),
      siteName: "MEDIA Rate",
      locale: localeOpenGraph(locale),
      type: "website",
      images: OG_IMAGE_PADRAO,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "rightsPage" });

  const direitos = [
    t("rightConfirm"),
    t("rightAccess"),
    t("rightCorrect"),
    t("rightAnonymize"),
    t("rightPortability"),
    t("rightSharing"),
    t("rightRevoke"),
  ];

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 [&_p]:max-w-[38rem] [&_li]:max-w-[38rem]">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-fg-primary mb-8">
        {t("title")}
      </h1>
      <p className="text-sm text-fg-secondary mb-8">{t("lastUpdated")}</p>

      <div className="space-y-8 text-fg-secondary leading-relaxed">
        <p>{t("intro")}</p>

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("selfServiceTitle")}
          </h2>
          <p className="mb-4">{t("selfServiceBody")}</p>
          <ul role="list" className="space-y-2">
            <li>
              <Link href="/settings" className="text-indigo hover:text-indigo-300">
                {t("exportLabel")}
              </Link>
            </li>
            <li>
              <Link href="/settings" className="text-indigo hover:text-indigo-300">
                {t("deleteLabel")}
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-sm">{t("deleteNote")}</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("rightsListTitle")}
          </h2>
          <ul role="list" className="list-disc space-y-2 pl-5">
            {direitos.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("noAccountTitle")}
          </h2>
          <p>{t("noAccountBody")}</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("deadlineTitle")}
          </h2>
          <p>{t("deadlineBody")}</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("dpoTitle")}
          </h2>
          <p className="mb-4">{t("dpoBody")}</p>
          <a
            href="mailto:endart.studios+direitos@gmail.com?subject=Pedido%20de%20titular%20—%20MEDIA%20Rate"
            className="inline-block rounded-md bg-accent-indigo px-4 py-2 text-sm font-semibold text-accent-indigo-foreground transition-[filter] hover:brightness-110 focus-ring"
          >
            {t("contactCta")}
          </a>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("anpdTitle")}
          </h2>
          <p className="mb-4">{t("anpdBody")}</p>
          <a
            href="https://www.gov.br/anpd/pt-br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-indigo hover:text-indigo-300"
          >
            {t("anpdCta")}
          </a>
        </section>
      </div>
    </article>
  );
}
