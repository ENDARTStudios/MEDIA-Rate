import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { localeOpenGraph, localizedAlternates, localizedUrl, OG_IMAGE_PADRAO } from "@/lib/seo";

/**
 * D-622 (T211) — página de Segurança (A CRIAR).
 *
 * Regra desta página: **declarar só o que existe e é verificável** — nada de selo decorativo.
 * Cada afirmação abaixo corresponde a algo que está no repositório: os cabeçalhos de
 * `next.config.ts` (CSP + os quatro de proteção), cookie de sessão HttpOnly com token
 * anti-CSRF nas ações, step-up/2FA na área administrativa, RLS no banco, backups com PITR
 * verificados por teste de restauração, Sentry e CodeQL/Gitleaks no CI. O que **não** temos
 * (ISO 27001, SOC 2) está dito na própria página.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "securityPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/seguranca"),
      languages: localizedAlternates("/seguranca"),
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: localizedUrl(locale, "/seguranca"),
      siteName: "MEDIA Rate",
      locale: localeOpenGraph(locale),
      type: "website",
      images: OG_IMAGE_PADRAO,
    },
    robots: { index: true, follow: true },
  };
}

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "securityPage" });

  const secoes = [
    { titulo: t("transportTitle"), corpo: t("transportBody") },
    { titulo: t("accountTitle"), corpo: t("accountBody") },
    { titulo: t("dataTitle"), corpo: t("dataBody") },
    { titulo: t("monitoringTitle"), corpo: t("monitoringBody") },
  ];

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 [&_p]:max-w-[38rem] [&_li]:max-w-[38rem]">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-fg-primary mb-8">
        {t("title")}
      </h1>
      <p className="text-sm text-fg-secondary mb-8">{t("lastUpdated")}</p>

      <div className="space-y-8 text-fg-secondary leading-relaxed">
        <p>{t("intro")}</p>

        {secoes.map((s) => (
          <section key={s.titulo}>
            <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">{s.titulo}</h2>
            <p>{s.corpo}</p>
          </section>
        ))}

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("reportTitle")}
          </h2>
          <p className="mb-4">{t("reportBody")}</p>
          <a
            href="mailto:endart.studios+security@gmail.com?subject=Relato%20de%20seguran%C3%A7a%20—%20MEDIA%20Rate"
            className="inline-block rounded-md bg-[#818CF8] px-4 py-2 text-sm font-semibold text-[#0F172A] transition-[filter] hover:brightness-110 focus-ring"
          >
            {t("reportCta")}
          </a>
          {/* D-624: o endereço também em texto — quem copia à mão (ou usa leitor de tela sem
              abrir o cliente de e-mail) precisa do canal legível, não só do `href`. */}
          <p className="mt-3 text-sm font-mono">endart.studios+security@gmail.com</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-fg-primary mb-3">
            {t("noCertTitle")}
          </h2>
          <p>{t("noCertBody")}</p>
        </section>
      </div>
    </article>
  );
}
