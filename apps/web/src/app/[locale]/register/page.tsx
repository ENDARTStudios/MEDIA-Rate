import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/lib/navigation";
import { AuthBladeCard } from "@/components/AuthBladeCard";
import { Logo } from "@/components/Logo";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    // T406: sem "— MEDIA Rate" manual + languages p/ hreflang.
    title: t("registerTitle"),
    description: t("registerSubtitle"),
    alternates: {
      canonical: localizedUrl(locale, "/register"),
      languages: localizedAlternates("/register"),
    },
    robots: { index: true, follow: true },
  };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 sm:px-8 py-12">
      {/* D-626: a página não tinha `h1` — leitor de tela anunciava o card sem título de página.
          Visualmente oculto: o título visível continua sendo o do card. */}
      <h1 className="sr-only">{t("registerTitle")}</h1>
      <div className="w-full max-w-3xl">
        <div className="lg:hidden mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xl font-bold text-accent-indigo"
          >
            <Logo variant="inline" />
          </Link>
        </div>

        {/* D-595/D-596 (T211): mesmo card dividido do /login, entrando já no cadastro
            (a faixa repousa à esquerda, espelhada em relação ao login). */}
        <AuthBladeCard initialView="register" />
      </div>
    </div>
  );
}
