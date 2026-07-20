import { useTranslations } from "next-intl";
import Link from "next/link";

export interface MediaItem {
  id: string;
  titulo: string;
  tipo: string;
  ano_lancamento: number | null;
  imagem_url: string | null;
  score?: number | null;
}

const TIPO_LABEL: Record<string, string> = {
  FILME: "filme",
  SERIE: "serie",
  GAME: "game",
  LIVRO: "livro",
};

/**
 * Card de mídia para catálogo (T5.2).
 * Acessível: role="article", aria-label com título + tipo + ano + score.
 */
export function MediaCard({ media }: { media: MediaItem }) {
  const t = useTranslations("catalog");

  const tipoLabel = TIPO_LABEL[media.tipo] ?? media.tipo;
  const scoreLabel = media.score != null ? `${media.score}/100` : "—";

  return (
    <Link
      href={`/midia/${media.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-700"
      role="article"
      aria-label={`${media.titulo} (${t(tipoLabel)}, ${media.ano_lancamento ?? "—"}, MEDIA Score ${scoreLabel})`}
    >
      <div className="aspect-[2/3] bg-gray-100 dark:bg-gray-700 relative">
        {media.imagem_url ? (
          // biome-ignore lint/performance/noImgElement: Next/Image não disponível no ambiente de teste
          <img
            src={media.imagem_url}
            alt={`Capa de ${media.titulo}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400" aria-hidden="true">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {media.score != null && (
          <div
            className="absolute top-2 right-2 bg-primary-700 text-white text-xs font-bold px-2 py-1 rounded-md"
            aria-label={`${t("mediaScore")}: ${media.score}`}
          >
            {media.score}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {media.titulo}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t(tipoLabel)} · {media.ano_lancamento ?? "—"}
        </p>
      </div>
    </Link>
  );
}
