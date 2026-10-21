"use client";

/**
 * Contagem por tipo de obra, em UMA requisição.
 *
 * Antes: seis chamadas `getCatalog({ type, limit: 1 })` — só para ler `total` de cada
 * tipo. Isso pesava na primeira carga (spec §11, P2) e era facilmente deduplicado pelo
 * cache, mas continuava sendo seis idas ao servidor em cada sessão fria.
 *
 * Agora: `GET /api/v1/midias/totais` devolve `{ FILME: 9158, SERIE: 1840, ... }` de uma
 * consulta `groupBy`. O mapeamento para as chaves do app (movie/series/...) fica aqui.
 *
 * Degradação honesta: se o endpoint falhar (API antiga durante um deploy, por exemplo),
 * a contagem fica vazia e a UI simplesmente não mostra número — nenhum card quebra e
 * nenhuma consulta por tipo é disparada como fallback (seria recriar o problema).
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import type { MediaType } from "@/lib/types";

// D-233/T231: "anime" não é categoria — animação japonesa é série;
// mangá (quadrinhos japonês) é categoria própria.
export const TIPOS_DO_CATALOGO: { id: MediaType; rotulo: string }[] = [
  { id: "movie", rotulo: "Filmes" },
  { id: "series", rotulo: "Séries" },
  { id: "game", rotulo: "Games" },
  { id: "book", rotulo: "Livros" },
  { id: "comic", rotulo: "Quadrinhos" },
  { id: "manga", rotulo: "Mangás" },
];

/** Chave do enum da API (TipoMidia) por chave do app. */
const TIPO_API: Record<MediaType, string> = {
  movie: "FILME",
  series: "SERIE",
  game: "GAME",
  book: "LIVRO",
  comic: "COMIC",
  manga: "MANGA",
};

/** Traduz o payload do endpoint (`{ FILME: 10, ... }`) para as chaves do app. */
export function mapearTotais(totais: Record<string, number> | undefined) {
  const saida: Partial<Record<MediaType, number>> = {};
  for (const { id } of TIPOS_DO_CATALOGO) {
    const bruto = totais?.[TIPO_API[id]];
    if (typeof bruto === "number") saida[id] = bruto;
  }
  return saida;
}

export function useTiposComContagem(): Partial<Record<MediaType, number>> {
  const { data } = useQuery({
    queryKey: ["catalog-type-counts"],
    queryFn: async () => {
      const totais = await api.get<Record<string, number>>("/api/v1/midias/totais");
      return mapearTotais(totais ?? {});
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return data ?? {};
}
