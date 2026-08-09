import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { CatalogPageClient } from "../../../components/CatalogPageClient";
import { getCatalog } from "../../../lib/api";
import type { MediaType } from "../../../lib/types";
import { localizedAlternates, localizedUrl } from "../../../lib/seo";

type CatalogSort = "title" | "year" | "score";

function asMediaType(value: string | undefined): MediaType | undefined {
  switch (value) {
    case "movie":
    case "series":
    case "game":
    case "book":
    case "manga":
    case "comic":
      return value;
    default:
      return undefined;
  }
}

function asCatalogSort(value: string | undefined): CatalogSort | undefined {
  switch (value) {
    case "title":
    case "year":
    case "score":
      return value;
    default:
      return undefined;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Catálogo — MEDIA Rate",
    description: "Explore filmes, séries e games no MEDIA Rate.",
    alternates: {
      canonical: localizedUrl(locale, "/catalog"),
      languages: localizedAlternates("/catalog"),
    },
    robots: { index: true, follow: true },
  };
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; sort?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  const sp = await searchParams;
  const initialData = await getCatalog({
    page: 1,
    limit: 12,
    type: asMediaType(sp.type),
    sort: asCatalogSort(sp.sort),
    search: sp.q,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-[#EDE7DC]">{t("title")}</h1>
      <p className="text-[#9CA3AF] mb-6 max-w-2xl">
        Explore nosso catálogo de filmes, séries e games com o MEDIA Score™ unificado. Filtre por
        gênero, tipo e nota para encontrar seu próximo título favorito. Compare avaliações da
        crítica e do público em um único lugar.
      </p>
      <CatalogPageClient
        initialData={initialData}
        initialType={sp.type}
        initialSort={sp.sort}
        initialQuery={sp.q}
      />
    </div>
  );
}
