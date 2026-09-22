import type { StatusConsumo } from "@prisma/client";

/**
 * D-528/T027 — máquina de estados de consumo, FONTE ÚNICA compartilhada por:
 * - PUT /interacoes (interacoes.service);
 * - projeção de status do Kanban (watchlist.service.move).
 *
 * QUERO_CONSUMIR → CONSUMINDO / CONCLUIDO / ABANDONADO
 * CONSUMINDO     → CONCLUIDO / ABANDONADO
 * CONCLUIDO      → QUERO_CONSUMIR / CONSUMINDO (retomar/rever)
 * ABANDONADO     → QUERO_CONSUMIR / CONSUMINDO / CONCLUIDO (reclassificar)
 *
 * CONCLUIDO → ABANDONADO NÃO é permitido (item concluído não é
 * reclassificado como abandonado — caminho indireto via CONSUMINDO existe).
 */
export const TRANSOES_VALIDAS: Record<StatusConsumo, StatusConsumo[]> = {
  QUERO_CONSUMIR: ["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"],
  CONSUMINDO: ["CONSUMINDO", "CONCLUIDO", "ABANDONADO"],
  CONCLUIDO: ["CONCLUIDO", "QUERO_CONSUMIR", "CONSUMINDO"],
  ABANDONADO: ["ABANDONADO", "QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO"],
};

/** Transição permitida a partir de um status (null = novo registro: tudo ok). */
export function podeTransicionar(atual: StatusConsumo | null, proximo: StatusConsumo): boolean {
  if (atual == null) return true;
  return TRANSOES_VALIDAS[atual].includes(proximo);
}
