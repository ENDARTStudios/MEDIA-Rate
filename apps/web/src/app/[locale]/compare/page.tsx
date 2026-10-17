import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedAlternates, localizedUrl } from "@/lib/seo";
import { PageShell } from "@/components/ui/page-shell";
import { ComparePage } from "../../../components/ComparePage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compare" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: localizedUrl(locale, "/compare"),
      languages: localizedAlternates("/compare"),
    },
  };
}

export default async function CompareRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "compare" });
  return (
    <PageShell title={t("title")} intro={t("description")}>
      <ComparePage />
    </PageShell>
  );
}
