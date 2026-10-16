import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { DiscoverClient } from "../../../components/DiscoverClient";
import { getCatalog } from "../../../lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("catalog");
  return {
    title: `${t("discoverTitle")} — MEDIA Rate`,
    description: "Descubra novas mídias no MEDIA Rate.",
    alternates: { canonical: `https://mediarate.app/${locale}/discover` },
    robots: { index: true, follow: true },
  };
}

export default async function DiscoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  const initialData = await getCatalog({ page: 1, limit: 10, sort: "score" });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2 text-[#F5F5F7]">{t("discoverTitle")}</h1>
      <p className="text-[#A0A0B8] mb-6">
        {t("discoverSubtitle")}{" "}
        <a href="/catalog" className="text-[#818CF8] hover:text-[#A5B4FC] underline">
          {t("discoverFullCatalog")}
        </a>
      </p>
      {/* T210: o grid renderiza cards com <h3> (MediaCardShell) — sem um <h2> a
          página pulava o nível 2 (achado `skipped-heading` do detector de DOM).
          O h2 é o rótulo acessível da região de resultados (sr-only: a lista não
          tem título visual próprio). T210: o texto PT que estava hardcoded aqui
          virou i18n (discoverSubtitle / discoverFullCatalog). */}
      <section aria-labelledby="discover-list-title">
        <h2 id="discover-list-title" className="sr-only">
          {t("discoverListTitle")}
        </h2>
        <DiscoverClient initialData={initialData} />
      </section>
    </div>
  );
}
