import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { TopPageClient } from "../../../components/TopPageClient";
import { getTopPorTipo } from "../../../lib/api";
import type { MediaType } from "../../../lib/types";
import { localizedAlternates, localizedUrl } from "../../../lib/seo";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Rankings",
    description: "TOP 10 de filmes, séries, games, livros, quadrinhos e mangás pelo MEDIA Score™.",
    alternates: {
      canonical: localizedUrl(locale, "/top"),
      languages: localizedAlternates("/top"),
    },
    robots: { index: true, follow: true },
  };
}

/**
 * T162 (Onda A — Rankings): hub /top — SSR com o payload do tipo consultado
 * (mesmo padrão do catálogo: server aplica o filtro do searchParams).
 */
export default async function TopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const tipo = asMediaType(sp.type) ?? "movie";

  const payload = await getTopPorTipo(tipo);

  return <TopPageClient tipo={tipo} payload={payload} />;
}
