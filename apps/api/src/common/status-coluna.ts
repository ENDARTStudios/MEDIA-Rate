import type { StatusConsumo } from "@prisma/client";

/** T320/D-309 — fonte única de verdade do estado de consumo.
 *  `usuario_midia_interacao.status` é a fonte; `watchlist_entry.coluna` é a
 *  projeção no Kanban. Mapas bidirecionais para sincronizar no MESMO
 *  transaction (status → coluna e coluna → status). Nunca dois estados
 *  independentes. */
export const STATUS_PARA_COLUNA: Record<
  StatusConsumo,
  "WANT" | "WATCHING" | "COMPLETED" | "DROPPED"
> = {
  QUERO_CONSUMIR: "WANT",
  CONSUMINDO: "WATCHING",
  CONCLUIDO: "COMPLETED",
  ABANDONADO: "DROPPED",
};

export const COLUNA_PARA_STATUS: Record<
  "WANT" | "WATCHING" | "COMPLETED" | "DROPPED",
  StatusConsumo
> = {
  WANT: "QUERO_CONSUMIR",
  WATCHING: "CONSUMINDO",
  COMPLETED: "CONCLUIDO",
  DROPPED: "ABANDONADO",
};

export type WatchlistColuna = "WANT" | "WATCHING" | "COMPLETED" | "DROPPED";
