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

function asOptionalNumber(value: string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
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
  searchParams: Promise<{
    type?: string;
    sort?: string;
    q?: string;
    anoMin?: string;
    anoMax?: string;
    scoreMin?: string;
    scoreMax?: string;
    genero?: string;
    com_critica?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  const sp = await searchParams;
  const type = asMediaType(sp.type);
  const sort = asCatalogSort(sp.sort);
  const anoMin = asOptionalNumber(sp.anoMin);
  const anoMax = asOptionalNumber(sp.anoMax);
  const scoreMin = asOptionalNumber(sp.scoreMin);
  const scoreMax = asOptionalNumber(sp.scoreMax);
  const comCritica = sp.com_critica === "true";

  // T274: o HTML SSR do catálogo já vem filtrado — o server aplica TODOS os
  // filtros do searchParams (não só type/sort/q) e o cliente só refina.
  const initialData = await getCatalog({
    page: 1,
    limit: 12,
    type,
    sort,
    search: sp.q,
    anoMin,
    anoMax,
    scoreMin,
    scoreMax,
    genero: sp.genero,
    comCritica,
  });

  // Assinatura exata dos filtros usados neste fetch — o cliente só semeia a
  // query com initialData quando os filtros correntes coincidem (evita
  // dados velhos quando o usuário muda filtros client-side).
  const initialDataKey = JSON.stringify({
    type: type ?? null,
    sort: sort ?? null,
    query: sp.q ?? null,
    anoMin: anoMin ?? null,
    anoMax: anoMax ?? null,
    scoreMin: scoreMin ?? null,
    scoreMax: scoreMax ?? null,
    genero: sp.genero ?? null,
    comCritica,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-[#EDE7DC]">{t("title")}</h1>
      <p className="text-[#9CA3AF] mb-6 max-w-2xl">{t("catalogDesc")}</p>
      <CatalogPageClient
        initialData={initialData}
        initialDataKey={initialDataKey}
        initialType={sp.type}
        initialSort={sp.sort}
        initialQuery={sp.q}
      />
    </div>
  );
}
