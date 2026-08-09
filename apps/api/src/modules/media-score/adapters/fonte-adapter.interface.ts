/**
 * Contrato de adaptadores de fontes de nota (especificação "Fontes de Dados").
 *
 * Regras:
 * - `coletar()` retorna SOMENTE a nota numérica isolada (+ média/desvio da
 *   fonte para o z-score). Nunca texto, imagens ou metadados editoriais.
 * - `ativo()` decide por env: chaves presentes, flags de scrape numérico ou
 *   preparação (P2 — adaptadores existem mas NÃO são ativados).
 * - Falhas de rede/parse são toleradas pelo ColetaService (adapter retorna []).
 */

export interface ConsultaMedia {
  tipo: string; // FILME | SERIE | GAME | LIVRO | HQ | ANIME
  titulo: string;
  ano?: number;
  /** IDs externos conhecidos (ex.: { steam_appid: "1234", imdb_id: "tt..." }). */
  idsExternos?: Record<string, string>;
}

export interface NotaColetada {
  /** Id canônico no source-registry (ex.: "tmdb", "metacritic"). */
  fonte: string;
  /** Rating BRUTO na escala original da fonte (0–10, 0–100, 0–5, ratio 0–1…). */
  rating: number;
  /** Média estatística da fonte (mesma escala do rating). */
  media_fonte: number;
  /** Desvio-padrão estatístico da fonte (mesma escala do rating). */
  desvio_fonte: number;
  /** Votos/reviews reportados pela fonte para a obra (v3 MET-03). */
  votos?: number;
  /** URL pública da nota (para transparência/auditoria). */
  url?: string;
}

export interface FonteAdapter {
  readonly id: string;
  /** A fonte cobre o tipo de mídia consultado? */
  atendeTipo(tipo: string): boolean;
  /** Configuração presente (chave/flag) e fonte pronta para coletar? */
  ativo(): boolean;
  coletar(consulta: ConsultaMedia): Promise<NotaColetada[]>;
}

import type { DominioMidia } from "../source-registry.js";

/** Tipo da mídia (API) → domínio do registro. */
export function dominioDoTipo(tipo: string): DominioMidia | null {
  switch (tipo) {
    case "FILME":
    case "SERIE":
      return "filme_serie";
    case "GAME":
      return "game";
    case "LIVRO":
      return "livro";
    case "HQ":
      return "hq";
    case "ANIME":
    case "MANGA":
      // D-233/T231: ANIME ficou deprecated (animação japonesa = SERIE);
      // MANGA (quadrinho japonês) mantém o mesmo domínio de fontes
      // (jikan/anilist/kitsu/mangadex/animeplanet).
      return "anime_manga";
    default:
      return null;
  }
}

/** Médias/desvios estatísticos por escala (aproximações de referência). */
export const ESTATISTICAS_POR_ESCALA: Record<string, { media: number; desvio: number }> = {
  "0-10": { media: 7.0, desvio: 1.5 },
  "0-100": { media: 70, desvio: 15 },
  "0-5": { media: 3.5, desvio: 0.6 },
  "0-4": { media: 3.0, desvio: 0.5 },
  "ratio": { media: 0.75, desvio: 0.2 },
};

/** Estatísticas de referência da escala com fallback seguro. */
export function estatisticas(escala: string): { media: number; desvio: number } {
  return ESTATISTICAS_POR_ESCALA[escala] ?? { media: 5, desvio: 1 };
}
