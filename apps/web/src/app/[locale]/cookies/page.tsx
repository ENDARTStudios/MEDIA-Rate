import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/lib/navigation";
import { localeOpenGraph, localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "@/lib/seo";

/**
 * D-622 (T211) — página de Cookies (A CRIAR na auditoria: a inventariação existia apenas
 * como tabela dentro da Política de Privacidade, o que prejudicava a achabilidade do direito
 * de informação).
 *
 * Esta página é o **resumo por categoria** com o caminho de ação; o inventário completo
 * (nome, finalidade, duração) continua na Política de Privacidade, que é a fonte única dessa
 * tabela — duplicá-la aqui criaria duas listas para divergir.
 *
 * Estática como as demais legais (D-590): `force-static` + `revalidate` de 1h.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cookiesPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/cookies"),
      languages: localizedAlternates("/cookies"),
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: localizedUrl(locale, "/cookies"),
      siteName: "MEDIA Rate",
      locale: localeOpenGraph(locale),
      type: "website",
      images: OG_IMAGE_PADRAO,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "cookiesPage" });

  const categorias = [
    { titulo: t("necessaryTitle"), corpo: t("necessaryBody") },
    { titulo: t("analyticsTitle"), corpo: t("analyticsBody") },
    { titulo: t("monitoringTitle"), corpo: t("monitoringBody") },
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 [&_p]:max-w-[38rem] [&_li]:max-w-[38rem]">
      <h1 className="mb-8 font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl">
        {t("title")}
      </h1>
      <p className="text-sm text-fg-secondary mb-8">{t("lastUpdated")}</p>

      <div className="space-y-8 text-fg-secondary leading-relaxed">
        <p>{t("intro")}</p>

        {categorias.map((c) => (
          <section key={c.titulo}>
            <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">{c.titulo}</h2>
            <p>{c.corpo}</p>
          </section>
        ))}

        <p>{t("noAds")}</p>

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("changeTitle")}
          </h2>
          <p className="mb-4">{t("changeBody")}</p>
          <Link
            href="/cookies/gerenciar"
            className="inline-block rounded-md bg-accent-indigo px-4 py-2 text-sm font-semibold text-accent-indigo-foreground transition-[filter] hover:brightness-110 focus-ring"
          >
            {t("changeCta")}
          </Link>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("privacyNoteTitle")}
          </h2>
          <p className="mb-4">{t("privacyNoteBody")}</p>
          <Link href="/privacy" className="text-sm font-medium text-indigo hover:text-indigo-300">
            {t("privacyNoteCta")}
          </Link>
        </section>
      </div>
    </article>
  );
}
