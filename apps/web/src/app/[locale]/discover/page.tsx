import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PageShell } from "@/components/ui/page-shell";
import { Link } from "@/lib/navigation";
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
    <PageShell
      title={t("discoverTitle")}
      intro={
        <>
          {t("discoverSubtitle")}{" "}
          <Link
            href="/catalog"
            className="text-accent-indigo underline underline-offset-4 transition-colors hover:text-accent-indigo-hover"
          >
            {t("discoverFullCatalog")}
          </Link>
        </>
      }
    >
      {/* T210: o grid renderiza cards com <h3> (MediaCardShell) — sem o h2 abaixo a
          página pulava o nível 2 (achado `skipped-heading` do detector de DOM). O
          h2 é o rótulo acessível da região de resultados; sr-only porque a lista
          não tem título visual próprio. T210: o texto PT hardcoded que existia
          aqui virou i18n (discoverSubtitle / discoverFullCatalog). */}
      <section aria-labelledby="discover-list-title">
        <h2 id="discover-list-title" className="sr-only">
          {t("discoverListTitle")}
        </h2>
        <DiscoverClient initialData={initialData} />
      </section>
    </PageShell>
  );
}
