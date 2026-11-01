"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { mapToMediaItem } from "@/lib/catalog-item";
import { CatalogGrid } from "./CatalogGrid";
import { useTiposComContagem } from "./catalog/useTiposComContagem";
import { usePreviewsPorTipo } from "./catalog/usePreviewsPorTipo";
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
  //
  // As contagens vêm do MESMO hook que a sidebar e os chips usam — uma requisição
  // (`/midias/totais`). Antes havia aqui um `useQuery` com a MESMA queryKey
  // ("catalog-type-counts") e um fetcher DIFERENTE (seis `getCatalog({type, limit:1})`):
  // o react-query cacheia por chave, então quem disparasse primeiro decidia quantas
  // requisições aconteciam — e a versão de seis vencia quando as seções montavam antes.
  const counts = useTiposComContagem();

  if (activeType) return null;

  // Uma requisição para as seis fileiras (antes: uma por tipo).
  const previews = usePreviewsPorTipo(ROW_LIMIT);

  const tiposComItens = TYPES.filter((t) => (counts[t] ?? 0) > 0);
  if (tiposComItens.length === 0) return null;

  return (
    <div data-testid="catalog-type-sections" className="mb-10 space-y-12">
      {tiposComItens.map((type) => (
        <CatalogTypeRow key={type} type={type} midias={previews[type] ?? []} />
      ))}
    </div>
  );
}

function CatalogTypeRow({ type, midias }: { type: MediaType; midias: Record<string, unknown>[] }) {
  const t = useTranslations("catalog");
  // Sem consulta própria: os itens chegam do preview agregado. `isLoading` some com a
  // busca da fileira; o estado de carregamento fica no agregado, que é um só.
  const isLoading = midias.length === 0;
  const items = midias.map((m) =>
    mapToMediaItem(m as unknown as Parameters<typeof mapToMediaItem>[0]),
  );
  // Seção vazia é OMITIDA (nunca header sem itens).
  if (!isLoading && items.length === 0) return null;

  const titleId = `catalog-type-${type}-title`;
  return (
    <section data-testid={`catalog-type-section-${type}`} aria-labelledby={titleId}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-xl font-bold text-fg-primary">
          {t(TIPO_KEY[type])}
        </h2>
        <Link
          href={`/catalog?type=${type}`}
          data-testid={`catalog-type-see-all-${type}`}
          className="rounded text-xs font-semibold text-accent-indigo hover:text-accent-indigo-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
        >
          {t("seeAll")}
        </Link>
      </div>
      {isLoading && items.length === 0 ? (
        <p
          data-testid={`catalog-type-${type}-loading`}
          role="status"
          className="py-6 text-sm text-fg-secondary"
        >
          {t("loadingCatalog")}
        </p>
      ) : (
        <CatalogGrid medias={items} />
      )}
    </section>
  );
}
