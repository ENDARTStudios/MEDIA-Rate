"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { getCatalog } from "@/lib/api";
import { mapToMediaItem } from "@/lib/catalog-item";
import { CatalogGrid } from "./CatalogGrid";
import type { MediaType } from "@/lib/types";

/**
 * BETA-GAP-11/T128 — seções por tipo de mídia no catálogo.
 *
 * Somente dados REAIS: cada seção usa `getCatalog({ type, limit })` e só é
 * exibida quando o tipo tem itens (contagem real > 0). Sem curadoria/destaque/
 * IA inventados; sem contagem falsa; seção vazia é OMITIDA. Na visão filtrada
 * (`?type=`) as seções somem para não duplicar o grid principal.
 */

// Ordem determinística = ícones do hero / type bar (T185).
const TYPES: MediaType[] = ["movie", "series", "game", "book", "comic", "manga"];
const ROW_LIMIT = 8;

/** Chaves i18n do namespace "catalog" por tipo. */
const TIPO_KEY: Record<MediaType, "filme" | "serie" | "game" | "livro" | "comic" | "manga"> = {
  movie: "filme",
  series: "serie",
  game: "game",
  book: "livro",
  comic: "comic",
  manga: "manga",
};

export function CatalogTypeSections() {
  const sp = useSearchParams();
  const activeType = sp.get("type");

  // Hooks antes de qualquer early-return (regras de hooks). `enabled` evita
  // fetch desnecessário quando há filtro de tipo ativo.
  const { data: counts } = useQuery({
    queryKey: ["catalog-type-counts"],
    queryFn: async () => {
      const results = await Promise.all(
        TYPES.map(async (type) => {
          const data = await getCatalog({ type, limit: 1 });
          return [type, data?.total ?? 0] as const;
        }),
      );
      return Object.fromEntries(results) as Record<MediaType, number>;
    },
    enabled: !activeType,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (activeType) return null;

  const tiposComItens = TYPES.filter((t) => (counts?.[t] ?? 0) > 0);
  if (tiposComItens.length === 0) return null;

  return (
    <div data-testid="catalog-type-sections" className="mb-10 space-y-8">
      {tiposComItens.map((type) => (
        <CatalogTypeRow key={type} type={type} />
      ))}
    </div>
  );
}

function CatalogTypeRow({ type }: { type: MediaType }) {
  const t = useTranslations("catalog");
  const { data, isLoading } = useQuery({
    queryKey: ["catalog-type-row", type],
    queryFn: () => getCatalog({ type, limit: ROW_LIMIT }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const items = (data?.items ?? []).map(mapToMediaItem);
  // Seção vazia é OMITIDA (nunca header sem itens).
  if (!isLoading && items.length === 0) return null;

  const titleId = `catalog-type-${type}-title`;
  return (
    <section data-testid={`catalog-type-section-${type}`} aria-labelledby={titleId}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-xl font-bold text-[#EDE7DC]">
          {t(TIPO_KEY[type])}
        </h2>
        <Link
          href={`/catalog?type=${type}`}
          data-testid={`catalog-type-see-all-${type}`}
          className="rounded text-xs font-semibold text-[#818CF8] hover:text-[#A5B4FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#818CF8]"
        >
          {t("seeAll")}
        </Link>
      </div>
      {isLoading && items.length === 0 ? (
        <p
          data-testid={`catalog-type-${type}-loading`}
          role="status"
          className="py-6 text-sm text-[#6B7280]"
        >
          {t("loadingCatalog")}
        </p>
      ) : (
        <CatalogGrid medias={items} />
      )}
    </section>
  );
}
