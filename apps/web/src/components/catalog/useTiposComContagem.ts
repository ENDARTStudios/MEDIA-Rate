"use client";

/**
 * Contagem por tipo de obra compartilhada entre a barra de chips e a sidebar.
 *
 * Antes a consulta vivia dentro de `CatalogTypeBar`, com a chave `catalog-type-counts`.
 * A sidebar do conceito v1 também mostra o número ao lado de cada tipo — em vez de duas
 * consultas iguais, as duas usam ESTE hook e o cache do react-query deduplica: uma
 * requisição por sessão, `staleTime` de 10 minutos.
 */
import { useQuery } from "@tanstack/react-query";
import { getCatalog } from "@/lib/api";
import type { MediaType } from "@/lib/types";

// D-233/T231: "anime" não é categoria — animação japonesa é série;
// mangá (quadrinho japonês) é categoria própria.
export const TIPOS_DO_CATALOGO: { id: MediaType; rotulo: string }[] = [
  { id: "movie", rotulo: "Filmes" },
  { id: "series", rotulo: "Séries" },
  { id: "game", rotulo: "Games" },
  { id: "book", rotulo: "Livros" },
  { id: "comic", rotulo: "Quadrinhos" },
  { id: "manga", rotulo: "Mangás" },
];

export function useTiposComContagem(): Partial<Record<MediaType, number>> {
  const { data } = useQuery({
    queryKey: ["catalog-type-counts"],
    queryFn: async () => {
      const resultados = await Promise.all(
        TIPOS_DO_CATALOGO.map(async ({ id }) => {
          const resposta = await getCatalog({ type: id, limit: 1 });
          return [id, resposta?.total ?? 0] as const;
        }),
      );
      return Object.fromEntries(resultados) as Record<MediaType, number>;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return data ?? {};
}
