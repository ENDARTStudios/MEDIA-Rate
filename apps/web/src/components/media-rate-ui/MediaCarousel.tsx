/**
 * MediaCarousel (T185) — carrossel por categoria, agora SERVER COMPONENT
 * (T405/D-380).
 *
 * - 6 categorias na ordem dos ícones do hero: Filme/Série/Game/Livro/HQ/Mangá
 *   (dados reais da API via MediaCardShell — shell sem hidratação).
 * - Scroll-snap horizontal; setas são uma ilha client mínima (CarouselControls)
 *   que usa o id do container; swipe nativo no mobile.
 * - Cabeçalho = ícone 2D flat + nome + contagem no accent.
 * - A11y: aria-label no carrossel; botões de navegação acessíveis.
 *
 * D-380: os 60 cards NÃO hidratam JS — só 6 ilhas de setas + 60 ilhas de
 * coração/status. O HTML SSR já contém os links (T274), vindo do initialData
 * buscado no server (ISR ≤ 60s) pela página.
 */
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { MediaCardShell } from "./MediaCardShell";
import { CarouselControls } from "./CarouselControls";
import { CarouselInteractions } from "./CarouselInteractions";
import type { MediaType, CatalogResponse } from "@/lib/types";
import type { MediaItem } from "@/components/MediaCard";

// T258: chaves por MediaType (lowercase) e por tipo da API — o bug era
// `type.toUpperCase()` gerar "SERIES" (plural) que não existia no mapa e o
// fallback silencioso `?? "movie"` fazer a seção SERIES carregar FILMES.
const TIPO_TO_ITEM: Record<string, string> = {
  movie: "FILME",
  series: "SERIE",
  game: "GAME",
  book: "LIVRO",
  comic: "COMIC",
  manga: "MANGA",
};

function mapToMediaItem(m: {
  id: string;
  slug?: string | null;
  title: string;
  titleLocalized?: { pt: string; en: string; es: string };
  type: string;
  year: number;
  posterUrl: string | null;
  score?: { consolidated?: number | null } | null;
  numFontes?: number;
}): MediaItem {
  return {
    id: m.id,
    slug: m.slug,
    titulo: m.title,
    titulo_original: m.titleLocalized?.en ?? m.title,
    tipo: TIPO_TO_ITEM[m.type] ?? m.type.toUpperCase(),
    ano_lancamento: m.year,
    imagem_url: m.posterUrl,
    score: m.score?.consolidated ?? null,
    numFontes: m.numFontes ?? 0,
  };
}

const TIPO_KEY: Record<MediaType, string> = {
  movie: "filme",
  series: "serie",
  game: "game",
  book: "livro",
  comic: "comic",
  manga: "manga",
};

export interface MediaCarouselProps {
  type: MediaType;
  count?: number;
  className?: string;
  /** T274: dados buscados no server (ISR ≤ 60s) para o HTML SSR já conter o
   *  carrossel — crawlers e primeiro paint veem conteúdo sem JS. */
  initialData: CatalogResponse | null;
  /** Traduções do namespace "catalog" (resolvidas pela página server). */
  tCatalog: (key: string) => string;
  /** Traduções "watchlist" para os botões estáticos (coração). */
  tWatchlist: (key: string) => string;
  /** Traduções "interaction" para os botões estáticos (status +). */
  tInteraction: (key: string) => string;
  /** Locale ativo (para o título localizado dos cards). */
  locale: string;
}

export function MediaCarousel({
  type,
  count,
  className,
  initialData,
  tCatalog,
  tWatchlist,
  tInteraction,
  locale,
}: MediaCarouselProps) {
  const { color: accent, icon: Icon } = CATEGORY_TOKENS[type];
  const items: MediaItem[] = (initialData?.items ?? []).map(mapToMediaItem);
  const total = count ?? initialData?.total ?? items.length;
  const title = tCatalog(TIPO_KEY[type]);
  const listId = `carousel-list-${type}`;

  return (
    <section
      className={cn("py-8 px-4", className)}
      aria-labelledby={`carousel-${type}`}
      data-testid={`carousel-${type}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}1F`, color: accent }}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
          <h2
            id={`carousel-${type}`}
            className="font-heading text-lg font-bold text-[#F5F5F7] uppercase tracking-wider"
          >
            {title}
          </h2>
          {total != null && total > 0 && (
            <span className="tabular-nums text-xs text-[#80809B]">{total}</span>
          )}
          <CarouselControls
            listId={listId}
            prevLabel={`Anterior — ${title}`}
            nextLabel={`Próximo — ${title}`}
          />
        </div>

        <CarouselInteractions>
          <div
            id={listId}
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4"
            aria-label={title}
          >
            {items.map((m) => (
              <div key={m.id} className="w-[160px] sm:w-[180px] flex-shrink-0 snap-start">
                <MediaCardShell
                  media={m}
                  tCatalog={tCatalog}
                  tWatchlist={tWatchlist}
                  tInteraction={tInteraction}
                  locale={locale}
                />
              </div>
            ))}
            {items.length === 0 && (
              <p className="py-12 text-sm text-[#80809B]">{tCatalog("noResults")}</p>
            )}
          </div>
        </CarouselInteractions>
      </div>
    </section>
  );
}
