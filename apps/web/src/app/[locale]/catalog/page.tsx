import { getTranslations, setRequestLocale } from "next-intl/server";
import { MediaCard, type MediaItem } from "../../../components/MediaCard";

/**
 * Página de catálogo (T5.2).
 *
 * Em produção, busca dados de GET /api/v1/midias (backend NestJS).
 * Por ora, usa dados mock para validar renderização + responsividade.
 */
const MOCK_MEDIAS: MediaItem[] = [
  {
    id: "1",
    titulo: "The Shawshank Redemption",
    tipo: "FILME",
    ano_lancamento: 1994,
    imagem_url: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    score: 92,
  },
  {
    id: "2",
    titulo: "The Dark Knight",
    tipo: "FILME",
    ano_lancamento: 2008,
    imagem_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    score: 88,
  },
  {
    id: "3",
    titulo: "Breaking Bad",
    tipo: "SERIE",
    ano_lancamento: 2008,
    imagem_url: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    score: 95,
  },
  {
    id: "4",
    titulo: "The Witcher 3",
    tipo: "GAME",
    ano_lancamento: 2015,
    imagem_url: null,
    score: 90,
  },
  {
    id: "5",
    titulo: "The Lord of the Rings",
    tipo: "LIVRO",
    ano_lancamento: 1954,
    imagem_url: null,
    score: 85,
  },
  {
    id: "6",
    titulo: "Interstellar",
    tipo: "FILME",
    ano_lancamento: 2014,
    imagem_url: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    score: 87,
  },
];

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">{t("title")}</h1>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            {t("search")}
          </label>
          <input
            id="search"
            type="search"
            placeholder={t("search")}
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-700"
          />
        </div>
        <div>
          <label htmlFor="filter-type" className="sr-only">
            {t("filterType")}
          </label>
          <select
            id="filter-type"
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-700"
            defaultValue="all"
          >
            <option value="all">{t("all")}</option>
            <option value="FILME">{t("filme")}</option>
            <option value="SERIE">{t("serie")}</option>
            <option value="GAME">{t("game")}</option>
            <option value="LIVRO">{t("livro")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="sr-only">
            {t("sort")}
          </label>
          <select
            id="sort"
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-700"
            defaultValue="titulo"
          >
            <option value="titulo">{t("sortTitulo")}</option>
            <option value="ano_lancamento">{t("sortAno")}</option>
          </select>
        </div>
      </div>

      {/* Grid responsivo: 2 cols mobile, 3 cols tablet, 5 cols desktop */}
      <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {MOCK_MEDIAS.map((media) => (
          <MediaCard key={media.id} media={media} />
        ))}
      </div>

      {/* Paginação (placeholder — em produção, cursor-based do backend) */}
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          className="px-6 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-700"
        >
          {t("loadMore")}
        </button>
      </div>
    </div>
  );
}
