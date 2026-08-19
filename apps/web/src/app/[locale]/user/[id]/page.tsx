import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PublicProfileContent } from "@/components/PublicProfileContent";
import { localeOpenGraph, localizedAlternates, localizedUrl } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  // T340: canonical era "/user" (rota inexistente → 404). Apontar para a
  // página real /user/[id].
  const pathname = `/user/${id}`;
  const url = localizedUrl(locale, pathname);

  return {
    title: t("publicTitle"),
    description: t("publicDesc"),
    alternates: { canonical: url, languages: localizedAlternates(pathname) },
    openGraph: {
      title: t("publicTitle"),
      description: t("publicDesc"),
      url,
      locale: localeOpenGraph(locale),
      type: "profile",
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <PublicProfileContent userId={id} />;
}
