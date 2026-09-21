import { api } from "@/lib/http";

/**
 * Cliente de interação de consumo + reação (T200, Addendum 4) — a interação
 * básica que gera o sinal do motor. Consome GET/PUT /api/v1/interacoes
 * (T198) com a máquina de estados validada também no servidor.
 *
 * Dois eixos independentes (Addendum 4 §1): status de consumo +
 * reação. O valor interno é agnóstico de mídia; só o rótulo muda por tipo.
 */

export type ConsumoStatus = "QUERO_CONSUMIR" | "CONSUMINDO" | "CONCLUIDO" | "ABANDONADO";
export type Reacao = "GOSTEI" | "NAO_GOSTEI";
export type MotivoAbandono = "NAO_CURTI" | "FALTA_TEMPO" | "MUDANCA_HUMOR";

export const CONSUMO_STATUSES: ConsumoStatus[] = [
  "QUERO_CONSUMIR",
  "CONSUMINDO",
  "CONCLUIDO",
  "ABANDONADO",
];
export const REACOES: Reacao[] = ["GOSTEI", "NAO_GOSTEI"];
export const MOTIVOS_ABANDONO: MotivoAbandono[] = ["NAO_CURTI", "FALTA_TEMPO", "MUDANCA_HUMOR"];

export interface InteracaoEstado {
  status: ConsumoStatus;
  reacao: Reacao | null;
  motivoAbandono: MotivoAbandono | null;
}

/**
 * Máquina de estados de consumo (espelho do server, interacoes.service.ts).
 * QUERO_CONSUMIR → CONSUMINDO / CONCLUIDO / ABANDONADO
 * CONSUMINDO     → CONCLUIDO / ABANDONADO
 * CONCLUIDO      → QUERO_CONSUMIR / CONSUMINDO (retomar/rever)
 * ABANDONADO     → QUERO_CONSUMIR / CONSUMINDO / CONCLUIDO (reclassificar)
 * D-527: CONCLUIDO → ABANDONADO NÃO é permitido.
 */
const TRANSOES_VALIDAS: Record<ConsumoStatus, ConsumoStatus[]> = {
  QUERO_CONSUMIR: ["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"],
  CONSUMINDO: ["CONSUMINDO", "CONCLUIDO", "ABANDONADO"],
  CONCLUIDO: ["CONCLUIDO", "QUERO_CONSUMIR", "CONSUMINDO"],
  ABANDONADO: ["ABANDONADO", "QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO"],
};

/** Transição permitida a partir de um status (null = novo registro). */
export function podeTransicionar(atual: ConsumoStatus | null, proximo: ConsumoStatus): boolean {
  if (atual == null) return true;
  return TRANSOES_VALIDAS[atual].includes(proximo);
}

/** Reação só é editável quando o status (final) é CONCLUIDO ou ABANDONADO. */
export function reacaoEditavelPara(status: ConsumoStatus | null): boolean {
  return status === "CONCLUIDO" || status === "ABANDONADO";
}

interface ApiInteracao {
  id?: string;
  midia_id?: string;
  status?: ConsumoStatus | null;
  reacao?: Reacao | null;
  motivo_abandono?: MotivoAbandono | null;
}

function fromApi(d: ApiInteracao): InteracaoEstado | null {
  if (!d?.status) return null;
  return {
    status: d.status,
    reacao: d.reacao ?? null,
    motivoAbandono: d.motivo_abandono ?? null,
  };
}

export interface UpsertInteracaoPatch {
  status?: ConsumoStatus;
  reacao?: Reacao | null;
  motivoAbandono?: MotivoAbandono | null;
  /** T201 (G4) — id da aresta do grafo que originou a descoberta cross-mídia. */
  origemRelacaoId?: string | null;
}

/** PUT /interacoes — cria/atualiza status+reação (máquina validada no server). */
export async function upsertInteracao(
  midiaId: string,
  patch: UpsertInteracaoPatch,
): Promise<InteracaoEstado> {
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.reacao !== undefined) body.reacao = patch.reacao;
  if (patch.motivoAbandono !== undefined) body.motivoAbandono = patch.motivoAbandono;
  if (patch.origemRelacaoId !== undefined) body.origemRelacaoId = patch.origemRelacaoId;

  const d = await api.put<ApiInteracao>(`/api/v1/interacoes/${encodeURIComponent(midiaId)}`, body);
  return (
    fromApi(d) ?? { status: patch.status ?? "QUERO_CONSUMIR", reacao: null, motivoAbandono: null }
  );
}
