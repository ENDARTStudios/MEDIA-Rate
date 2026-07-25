import { getTranslations, setRequestLocale } from "next-intl/server";
import { LazyCatalogGrid } from "../../../components/lazy";
import type { MediaItem } from "../../../components/MediaCard";

const MOCK_MEDIAS: MediaItem[] = [
  {
    id: "1",
    titulo: "The Shawshank Redemption",
    tipo: "FILME",
    ano_lancamento: 1994,
    imagem_url: null,
    score: 92,
  },
  {
    id: "2",
    titulo: "Breaking Bad",
    tipo: "SERIE",
    ano_lancamento: 2008,
    imagem_url: null,
    score: 95,
  },
  {
    id: "3",
    titulo: "The Legend of Zelda: Breath of the Wild",
    tipo: "GAME",
    ano_lancamento: 2017,
    imagem_url: null,
    score: 97,
  },
  {
    id: "4",
    titulo: "1984",
    tipo: "LIVRO",
    ano_lancamento: 1949,
    imagem_url: null,
    score: 89,
  },
  {
    id: "5",
    titulo: "Inception",
    tipo: "FILME",
    ano_lancamento: 2010,
    imagem_url: null,
    score: 88,
  },
  {
    id: "6",
    titulo: "Interstellar",
    tipo: "FILME",
    ano_lancamento: 2014,
    imagem_url: null,
    score: 90,
  },
];

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-100">{t("title")}</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="search"
          placeholder={t("search")}
          className="flex-1 px-4 py-2 bg-surface-card border border-surface-border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <select
          className="px-4 py-2 bg-surface-card border border-surface-border rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
          defaultValue=""
        >
          <option value="">{t("all")}</option>
          <option value="FILME">{t("filme")}</option>
          <option value="SERIE">{t("serie")}</option>
          <option value="GAME">{t("game")}</option>
          <option value="LIVRO">{t("livro")}</option>
        </select>
        <select
          className="px-4 py-2 bg-surface-card border border-surface-border rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
          defaultValue=""
        >
          <option value="">{t("sort")}</option>
          <option value="title">{t("sortTitulo")}</option>
          <option value="date">{t("sortAno")}</option>
        </select>
      </div>

      <LazyCatalogGrid medias={MOCK_MEDIAS} />

      <div className="mt-8 flex justify-center">
        <button className="px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-400">
          {t("loadMore")}
        </button>
      </div>
    </div>
  );
}
