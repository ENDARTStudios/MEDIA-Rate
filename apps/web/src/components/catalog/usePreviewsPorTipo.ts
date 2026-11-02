"use client";

/**
 * Previews das seis fileiras do catálogo, em UMA requisição.
 *
 * Antes: cada seção (`CatalogTypeRow`) fazia seu próprio `getCatalog({ type, limit: 8 })`
 * — seis round-trips do navegador pelo proxy do Next. Agora uma chamada a
 * `/api/v1/midias/preview-por-tipo` traz `{ FILME: [...], SERIE: [...] }`, mapeado para as
 * chaves do app. As seis consultas ao banco continuam (são baratas, `LIMIT 8` indexado),
 * mas acontecem no servidor, em paralelo, atrás de um único request.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import type { MediaType } from "@/lib/types";

/** Chave do enum da API por chave do app. */
const TIPO_API: Record<MediaType, string> = {
  movie: "FILME",
  series: "SERIE",
  game: "GAME",
  book: "LIVRO",
  comic: "COMIC",
  manga: "MANGA",
};

type MidiaDaApi = Record<string, unknown>;

export type PreviewsPorTipo = Partial<Record<MediaType, MidiaDaApi[]>>;

/** Traduz o payload (`{ FILME: [...] }`) para as chaves do app. */
export function mapearPreviews(payload: Record<string, MidiaDaApi[]> | undefined): PreviewsPorTipo {
  const saida: PreviewsPorTipo = {};
  for (const [chave, tipoApi] of Object.entries(TIPO_API) as [MediaType, string][]) {
    const lista = payload?.[tipoApi];
    if (Array.isArray(lista)) saida[chave] = lista;
  }
  return saida;
}

export function usePreviewsPorTipo(limite = 8): PreviewsPorTipo {
  const { data } = useQuery({
    queryKey: ["catalog-type-previews", limite],
    queryFn: async () => {
      const payload = await api.get<Record<string, MidiaDaApi[]>>(
        `/api/v1/midias/preview-por-tipo?limite=${limite}`,
      );
      return mapearPreviews(payload ?? {});
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return data ?? {};
}
