import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedAlternates, localizedUrl } from "@/lib/seo";
import { ListaViewPage } from "../../../../components/ListaViewPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "listas" });
  const pathname = `/listas/${slug}`;
  return {
    title: `${t("title")} — MEDIA Rate`,
    description: t("title"),
    alternates: {
      canonical: localizedUrl(locale, pathname),
      languages: localizedAlternates(pathname),
    },
  };
}

export default async function ListaSlugRoute({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <ListaViewPage slug={slug} />;
}
