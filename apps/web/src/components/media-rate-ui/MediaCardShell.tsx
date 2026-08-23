/**
 * MediaCardShell (T405/D-380) — shell SERVER do card (sem "use client").
 *
 * Espelho visual do MediaCard (client) para os carrosséis da home, mas sem
 * hidratação do shell: nada de framer-motion/animejs/tilt/refs. As únicas
 * "ilhas" client são o coração (WatchlistButton) e o status
 * (StatusReactionControl), posicionados por cima do <Link> (irmãos, não
 * filhos → clique no ícone não navega).
 *
 * Mantém os 60 links <a href="/media/..."> no HTML SSR (T274) e a paridade
 * visual/lógica de score/título do MediaCard.tsx (T408: numFontes=0 → "—").
 */
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { normalizeDisplayScore } from "@/lib/score-utils";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import { titleForLocale } from "@/lib/i18n-content";
import { isPreviewTipo } from "@/lib/api";
import { StaticScoreDial } from "./StaticScoreDial";
import { CardIslands } from "./CardIslands";
import type { MediaItem } from "@/components/MediaCard";
import type { MediaType } from "@/lib/types";

const TIPO_LABEL: Record<string, string> = {
  FILME: "filme",
  SERIE: "serie",
  GAME: "game",
  LIVRO: "livro",
  MANGA: "manga",
  COMIC: "comic",
  MOVIE: "filme",
  SERIES: "serie",
  GAMES: "game",
  BOOK: "livro",
};

const TIPO_ICON: Record<string, string> = {
  FILME:
    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-4-4l-4 1.75V6h-2v8.75L7 13l-1.75 6L12 21l6.75-2z",
  SERIE: "M4 6h16v2H4zm0 4h16v2H4zm0 4h16v2H4z",
  GAME: "M15 7.5V9h-1.5v1H15v1.5h1.5V10H18V9h-1.5V7.5zM9 12c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-3 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm12 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-3-3c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z",
  LIVRO:
    "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z",
};

const TIPO_TO_MEDIA: Record<string, MediaType> = {
  FILME: "movie",
  SERIE: "series",
  GAME: "game",
  LIVRO: "book",
  MANGA: "manga",
  COMIC: "comic",
};

export function MediaCardShell({
  media,
  tCatalog,
  locale,
}: {
  media: MediaItem;
  tCatalog: (key: string) => string;
  locale: string;
}) {
  const tipoLabel = TIPO_LABEL[media.tipo] ?? media.tipo;
  const mediaType = TIPO_TO_MEDIA[media.tipo] ?? "movie";
  const category = CATEGORY_TOKENS[mediaType];
  const semFontesReais = media.numFontes === 0;
  const preview =
    (media.score == null || semFontesReais) &&
    (media.preview ?? isPreviewTipo(TIPO_TO_MEDIA[media.tipo] ?? "movie"));
  const scoreExibido =
    media.score != null && !semFontesReais ? normalizeDisplayScore(media.score, mediaType) : null;
  const escala = mediaType === "game" || mediaType === "manga" ? "0-100" : "0-10";
  const maxScore = escala === "0-100" ? 100 : 10;
  const scoreLabel =
    scoreExibido != null ? `${Math.round(scoreExibido * 10) / 10}/${maxScore}` : "—";
  const tituloLocal = titleForLocale(
    {
      title: media.titulo,
      id: media.id,
      titleLocalized: media.titulo_original
        ? { pt: media.titulo, en: media.titulo_original, es: media.titulo_original }
        : undefined,
    },
    locale,
  );
  const CategoryIcon = category.icon;
  const aspectRatio = "aspect-[2/3]";
  const srcNormalizado = (media.imagem_url ?? "").replace(/%25([0-9A-Fa-f]{2})/g, "%$1");

  return (
    <div className="relative group cursor-pointer rounded-md transition-transform duration-150 active:scale-[0.97]">
      <CardIslands mediaId={media.id} mediaType={mediaType} />

      <Link
        href={`/media/${media.slug ?? media.id}`}
        className="relative z-10 block bg-[#11111E] rounded-md border border-[rgba(129,140,248,0.1)] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-2 focus:ring-offset-[#09090F]"
        role="article"
        aria-label={`${tituloLocal} (${tCatalog(tipoLabel)}, ${media.ano_lancamento ?? "—"}, MEDIA Score ${scoreLabel})`}
      >
        <div className={`${aspectRatio} bg-[#1C1C2E] relative overflow-hidden`}>
          <div
            className="absolute top-0 left-0 right-0 h-[3px] z-20"
            style={{ backgroundColor: category.color }}
            aria-hidden="true"
          />
          <span
            className="absolute top-12 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: `${category.color}22`, color: category.color }}
            aria-hidden="true"
          >
            <CategoryIcon className="h-3.5 w-3.5" />
          </span>

          {media.imagem_url ? (
            <Image
              src={srcNormalizado}
              alt={`Capa de ${tituloLocal}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              width={300}
              height={450}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#9CA3AF] bg-gradient-to-br from-[#1C1C2E] to-[#09090F]">
              <svg
                className="w-12 h-12 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d={TIPO_ICON[media.tipo] ?? TIPO_ICON.FILME}
                />
              </svg>
            </div>
          )}

          {/* Overlay de hover em CSS puro (substitui o fade animejs do card
              client): tipo + ano sobre o pôster. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
            <span className="text-xs font-semibold text-[#818CF8] uppercase tracking-widest">
              {tCatalog(tipoLabel)}
            </span>
            <span className="text-xs text-[#9CA3AF] mt-0.5">{media.ano_lancamento ?? "—"}</span>
          </div>

          {preview && (
            <span
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 inline-flex items-center rounded-full border border-dashed border-[#F59E0B]/50 bg-[#09090F]/85 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#F59E0B]"
              aria-label={tCatalog("previewBadge")}
              data-testid="preview-badge"
            >
              {tCatalog("previewBadge")}
            </span>
          )}

          {scoreExibido != null && (
            <div className={`absolute top-2 right-2 z-20 ${preview ? "opacity-45" : ""}`}>
              <StaticScoreDial value={scoreExibido} size="md" scale={escala} />
            </div>
          )}
        </div>

        <div className="p-3 bg-[#11111E] rounded-b-md">
          <h3 className="font-heading text-sm font-medium text-[#EDE7DC] truncate group-hover:text-[#EDE7DC] transition-colors">
            {tituloLocal}
          </h3>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {tCatalog(tipoLabel)} &middot; {media.ano_lancamento ?? "—"}
          </p>
        </div>
      </Link>
    </div>
  );
}
