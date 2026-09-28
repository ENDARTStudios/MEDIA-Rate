import type { Media } from "@/lib/types";
import type { MediaItem } from "@/components/MediaCard";

/**
 * BETA-GAP-11/T128: mapeia o `Media` do catálogo para o `MediaItem` consumido
 * pelo `MediaCard`. Fonte única (CatalogPageClient + CatalogTypeSections) para
 * não divergir o card entre o grid principal e as seções por tipo.
 */
export function mapToMediaItem(media: Media): MediaItem {
  return {
    id: media.id,
    titulo: media.title,
    // T414: titulo_original = titleLocalized.en (cadeia D-369) — sem isso o
    // MediaCard caía no título PT em /en-US (achado b do Operador).
    titulo_original: media.titleLocalized?.en ?? media.title,
    slug: media.slug,
    tipo:
      media.type === "movie"
        ? "FILME"
        : media.type === "series"
          ? "SERIE"
          : media.type === "game"
            ? "GAME"
            : media.type === "manga"
              ? "MANGA"
              : media.type === "comic"
                ? "COMIC"
                : "LIVRO",
    ano_lancamento: media.year,
    imagem_url: media.posterUrl,
    score: media.score?.consolidated ?? null,
    preview: media.preview,
  };
}
