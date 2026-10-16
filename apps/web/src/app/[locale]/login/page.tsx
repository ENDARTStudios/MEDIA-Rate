import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/lib/navigation";
import { AuthBladeCard } from "@/components/AuthBladeCard";
import { LazyLogo } from "@/components/lazy";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    // T406: sem "— MEDIA Rate" manual (o template do layout já acrescenta a marca).
    title: t("loginTitle"),
    description: t("loginSubtitle"),
    // T406: languages para o hreflang (antes só canonical → hreflang perdido).
    alternates: {
      canonical: localizedUrl(locale, "/login"),
      languages: localizedAlternates("/login"),
    },
  };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 sm:px-8 py-12">
      {/* D-626: a página não tinha `h1` — leitor de tela anunciava o card sem título de página.
          Visualmente oculto: o título visível continua sendo o do card. */}
      <h1 className="sr-only">{t("loginTitle")}</h1>
      <div className="w-full max-w-3xl">
        <div className="lg:hidden mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xl font-bold text-[#818CF8]"
          >
            <LazyLogo className="w-8 h-8" /> MEDIA Rate
          </Link>
        </div>

        {/*
          D-595/D-596 (T211): card único dividido pela faixa inclinada. O texto de marca
          vive DENTRO da faixa, que troca junto com o formulário — antes havia uma coluna
          de marketing separada (`hidden md:flex`) mais uma coluna `max-w-sm` só do
          formulário, e o efeito não teria onde acontecer.
        */}
        <AuthBladeCard initialView="login" />
      </div>
    </div>
  );
}
