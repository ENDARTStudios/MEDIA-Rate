"use client";

import { useQuery } from "@tanstack/react-query";
import { getCatalog } from "@/lib/api";
import type { CatalogResponse } from "@/lib/types";
import { CatalogGrid } from "./CatalogGrid";
import { CatalogSkeleton } from "./CatalogSkeleton";
import type { MediaItem } from "./MediaCard";

function mapToMediaItem(media: any): MediaItem {
  return {
    id: media.id,
    titulo: media.title,
    tipo: (media.type === "movie" ? "FILME" : media.type === "series" ? "SERIE" : media.type === "game" ? "GAME" : media.type === "anime" ? "ANIME" : media.type === "comic" ? "COMIC" : "LIVRO"),
    ano_lancamento: media.year,
    imagem_url: media.posterUrl,
    score: media.score?.consolidated ?? null,
  };
}

export function DiscoverClient({ initialData }: { initialData?: CatalogResponse }) {
  const { data, isLoading } = useQuery({
    queryKey: ["discover"],
    queryFn: () => getCatalog({ page: 1, limit: 10, sort: "score" }),
    initialData,
    staleTime: 60 * 1000,
  });

  if (isLoading && !data) {
    return <CatalogSkeleton count={10} />;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
        <p className="text-[#9CA3AF]">Nenhuma mídia disponível no momento.</p>
        <a href="/catalog" className="mt-4 inline-block px-6 py-2 bg-[#818CF8] text-[#0F172A] rounded-lg hover:brightness-110 transition-colors">Explorar catálogo completo</a>
      </div>
    );
  }

  return <CatalogGrid medias={data.items.map(mapToMediaItem)} />;
}
