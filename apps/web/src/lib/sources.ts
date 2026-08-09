/**
 * sources.ts — FONTE ÚNICA DE VERDADE das fontes ativas (D-209, T191).
 *
 * Derivado de source-registry.ts (FONTES_WEB + PESOS_POR_TIPO_WEB): a lista
 * de fontes públicas do produto é GERADA a partir do registro, nunca
 * duplicada em texto. Home, About, /sources e /methodology mapeiam daqui —
 * Trakt.tv e toda fonte ativa aparecem em todos os lugares.
 *
 * Critério de "ativa": fonte usada nos pesos das categorias cobertas
 * (Filmes, Séries, Games) — mesmo cálculo do contador da Home.
 */
import { FONTES_WEB, PESOS_POR_TIPO_WEB } from "@/lib/source-registry";
import type { MediaType } from "@/lib/types";

export interface FonteAtiva {
  id: string;
  nome: string;
  tipo: "critica" | "publico";
  midias: MediaType[];
}

const TIPOS_COBERTOS = ["movie", "series", "game"] as const;

function fonteUsadaEm(tipo: (typeof TIPOS_COBERTOS)[number], fonteId: string): boolean {
  const bucket = PESOS_POR_TIPO_WEB[tipo];
  return fonteId in bucket.critica || fonteId in bucket.publico;
}

function tipoDaFonte(tipo: (typeof TIPOS_COBERTOS)[number], fonteId: string): "critica" | "publico" {
  return fonteId in PESOS_POR_TIPO_WEB[tipo].critica ? "critica" : "publico";
}

/** Fontes ativas (ordenadas alfabeticamente) com nome, tipo e mídias cobertas. */
export const FONTES_ATIVAS: FonteAtiva[] = Object.values(FONTES_WEB)
  .filter((f) => TIPOS_COBERTOS.some((t) => fonteUsadaEm(t, f.id)))
  .map((f) => ({
    id: f.id,
    nome: f.rotulo,
    tipo: tipoDaFonte("movie", f.id) as FonteAtiva["tipo"],
    midias: TIPOS_COBERTOS.filter((t) => fonteUsadaEm(t, f.id)) as MediaType[],
  }))
  .sort((a, b) => a.nome.localeCompare(b.nome));

/** Contador derivado — usado pela Home e por qualquer página que exiba o total. */
export const NUM_FONTES_ATIVAS = FONTES_ATIVAS.length;

/** Rótulo das mídias cobertas por uma fonte (pt-BR, para exibição). */
export const MIDIA_LABEL: Record<MediaType, string> = {
  movie: "Filmes",
  series: "Séries",
  game: "Games",
  book: "Livros",
  comic: "Quadrinhos",
  manga: "Mangás",
};
