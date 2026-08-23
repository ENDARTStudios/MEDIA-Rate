/**
 * watchlist-status-bridge.ts (U1, D-399) — camada de estado mínima para a
 * event delegation do T405. Fetch direto via api/http + upsertInteracao, SEM
 * zustand/motion. Usada pelo CarouselInteractions (U2); refactor puro — os
 * stores atuais continuam intactos (zero mudança de comportamento).
 */
import { api } from "@/lib/http";
import {
  upsertInteracao,
  type ConsumoStatus,
  type MotivoAbandono,
  type Reacao,
  type UpsertInteracaoPatch,
} from "@/lib/api-interactions";

export interface BridgeWatchlistItem {
  id: string;
  mediaId: string;
  status: string;
  coluna?: string;
}

export interface BridgeInteractionState {
  status: ConsumoStatus;
  reacao: Reacao | null;
  motivoAbandono: MotivoAbandono | null;
}

export async function fetchWatchlist(): Promise<BridgeWatchlistItem[]> {
  const data = await api.get<{ items?: BridgeWatchlistItem[] } | BridgeWatchlistItem[]>(
    "/api/v1/watchlist",
  );
  const items = Array.isArray(data) ? data : (data?.items ?? []);
  return items.map((e) => {
    const raw = e as unknown as Record<string, unknown>;
    const midia = raw.media as { id?: string } | null | undefined;
    return {
      id: String(e.id),
      mediaId: String(e.mediaId ?? raw.midia_id ?? midia?.id ?? ""),
      status: String(e.status ?? e.coluna ?? "WANT"),
      coluna: typeof e.coluna === "string" ? e.coluna : undefined,
    };
  });
}

export async function addToWatchlist(mediaId: string, status = "WANT"): Promise<void> {
  await api.post("/api/v1/watchlist", { midia_id: mediaId, coluna: status });
}

export async function moveWatchlistItem(entryId: string, newStatus: string): Promise<void> {
  await api.patch("/api/v1/watchlist/" + entryId + "/move", { coluna: newStatus });
}

export async function removeWatchlistItem(entryId: string): Promise<void> {
  await api.delete("/api/v1/watchlist/" + entryId);
}

/** Busca o estado de interação de UMA mídia (status/reacao/motivo). */
export async function fetchInteraction(midiaId: string): Promise<BridgeInteractionState | null> {
  const data = await api.get<{ items?: Record<string, unknown>[] } | Record<string, unknown>[]>(
    "/api/v1/interacoes",
  );
  const items = Array.isArray(data) ? data : (data?.items ?? []);
  for (const it of items) {
    const raw = it as Record<string, unknown>;
    const midia = raw.midia as { id?: string } | null | undefined;
    const id = String(raw.midia_id ?? midia?.id ?? "");
    if (id === midiaId && raw.status) {
      return {
        status: raw.status as ConsumoStatus,
        reacao: (raw.reacao as Reacao | null) ?? null,
        motivoAbandono: (raw.motivo_abandono as MotivoAbandono | null) ?? null,
      };
    }
  }
  return null;
}

export async function setStatus(
  midiaId: string,
  status: ConsumoStatus,
  extras?: {
    reacao?: Reacao | null;
    motivoAbandono?: MotivoAbandono | null;
    origemRelacaoId?: string | null;
  },
): Promise<void> {
  const body: UpsertInteracaoPatch = { status };
  if (extras?.reacao !== undefined) body.reacao = extras.reacao;
  if (status === "ABANDONADO") body.motivoAbandono = extras?.motivoAbandono ?? null;
  if (extras?.origemRelacaoId !== undefined) body.origemRelacaoId = extras.origemRelacaoId;
  await upsertInteracao(midiaId, body);
}

export async function setReaction(midiaId: string, reacao: Reacao | null): Promise<void> {
  await upsertInteracao(midiaId, { reacao });
}

export async function setMotivo(midiaId: string, motivo: MotivoAbandono | null): Promise<void> {
  await upsertInteracao(midiaId, { motivoAbandono: motivo });
}
