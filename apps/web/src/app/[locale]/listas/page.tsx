import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListasPage } from "../../../components/ListasPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "listas" });
  return { title: t("title"), description: t("title") };
}

export default async function ListasRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ListasPage />;
}
