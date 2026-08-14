"use client";

import { create } from "zustand";
import { api, ApiError } from "@/lib/http";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import {
  reacaoEditavelPara,
  upsertInteracao,
  type ConsumoStatus,
  type InteracaoEstado,
  type MotivoAbandono,
  type Reacao,
} from "@/lib/api-interactions";

/**
 * Estado compartilhado de interações (status + reação) por mídia.
 *
 * Fonte única para o StatusReactionControl (cards + ficha) e para o Kanban
 * (WatchlistKanban) — o selo de reação num card reflete o que foi definido
 * em qualquer lugar. Optimistic update + rollback em erro (T200).
 */

export interface InteractionMidia {
  id?: string;
  titulo?: string;
  tipo?: string;
  imagem_url?: string | null;
  score?: number | null;
  ano_lancamento?: number | null;
}

export interface InteractionEntry extends InteracaoEstado {
  midia?: InteractionMidia | null;
}

interface InteractionState {
  map: Record<string, InteractionEntry>;
  loaded: boolean;
  loading: boolean;
  /** T266: último erro de escrita (nunca engolido em silêncio — D-230). */
  lastError: string | null;
  /** Limpa o erro (ex.: ao abrir o popover de novo). */
  clearError: () => void;
  /** Hidrata o mapa a partir de GET /interacoes (lista do usuário). */
  fetchAll: () => Promise<void>;
  /** Muda o status (ex.: 1-tap QUERO_CONSUMIR) com optimistic + rollback. */
  setStatus: (
    midiaId: string,
    status: ConsumoStatus,
    extras?: {
      reacao?: Reacao | null;
      motivoAbandono?: MotivoAbandono | null;
      origemRelacaoId?: string | null;
    },
  ) => Promise<void>;
  /** Define/limpa a reação (só CONCLUIDO/ABANDONADO). Com optimistic + rollback. */
  setReaction: (midiaId: string, reacao: Reacao | null) => Promise<void>;
  /** Define/limpa o motivo de abandono (só ABANDONADO). Com optimistic + rollback. */
  setMotivo: (midiaId: string, motivo: MotivoAbandono | null) => Promise<void>;
}

function empty(): InteractionEntry {
  return { status: "QUERO_CONSUMIR", reacao: null, motivoAbandono: null };
}

/**
 * T308: erros de validação (400) nunca mostram o texto Zod raw na UI — o
 * detalhe técnico (schema/message + correlationId) fica no corpo da resposta
 * e no header X-Correlation-Id (http.ts), além do log/Sentry do backend.
 */
function mensagemAmigavel(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 400) {
    return "Não foi possível salvar. Verifique os dados e tente novamente.";
  }
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : fallback;
}

export const useInteractionStore = create<InteractionState>()((set, get) => ({
  map: {},
  loaded: false,
  loading: false,
  lastError: null,
  clearError: () => set({ lastError: null }),

  fetchAll: async () => {
    if (get().loaded) return;
    set({ loading: true });
    try {
      const data = await api.get<{ items?: Record<string, unknown>[] } | Record<string, unknown>[]>(
        "/api/v1/interacoes",
      );
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      const map: Record<string, InteractionEntry> = {};
      for (const it of items) {
        const midia = it.midia as InteractionMidia | null | undefined;
        const midiaId = String(it.midia_id ?? midia?.id ?? "");
        if (!midiaId || !it.status) continue;
        map[midiaId] = {
          status: it.status as ConsumoStatus,
          reacao: (it.reacao as Reacao | null) ?? null,
          motivoAbandono: (it.motivo_abandono as MotivoAbandono | null) ?? null,
          midia,
        };
      }
      set({ map, loaded: true, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setStatus: async (midiaId, status, extras) => {
    const hadPrior = Boolean(get().map[midiaId]);
    const prev = get().map[midiaId] ?? empty();
    // Reação só é editável em CONCLUIDO/ABANDONADO; fora disso o server
    // limpa a reação (dto.reacao ?? null). Alinha o estado local ao server
    // para evitar desync ao sair de um status final.
    const eligible = reacaoEditavelPara(status);
    const reacaoFinal =
      extras?.reacao !== undefined ? extras.reacao : eligible ? prev.reacao : null;
    const motivoFinal =
      status === "ABANDONADO"
        ? extras?.motivoAbandono !== undefined
          ? extras.motivoAbandono
          : prev.motivoAbandono
        : null;

    const proximo: InteractionEntry = {
      ...prev,
      status,
      reacao: reacaoFinal,
      motivoAbandono: motivoFinal,
    };
    set((s) => ({ map: { ...s.map, [midiaId]: proximo } }));
    try {
      const body: Record<string, unknown> = { status };
      // Só envia reação/motivo quando o status permite (senão o server
      // rejeita 400) — e envia sempre nos estados elegíveis para preservar.
      if (eligible && extras?.reacao === undefined) body.reacao = reacaoFinal;
      if (extras?.reacao !== undefined) body.reacao = extras.reacao;
      if (status === "ABANDONADO") body.motivoAbandono = motivoFinal;
      if (extras?.origemRelacaoId !== undefined) body.origemRelacaoId = extras.origemRelacaoId;
      await upsertInteracao(midiaId, body);
      // T320/D-309: status dirige a coluna — após persistir, re-sincroniza a
      // watchlist para o card mover de bloco no Kanban.
      void useWatchlistStore
        .getState()
        .fetchWatchlist()
        .catch(() => undefined);
    } catch (err) {
      // Rollback para o estado anterior; se não havia interação, remove.
      set((s) => {
        if (hadPrior) return { map: { ...s.map, [midiaId]: prev } };
        return {
          map: Object.fromEntries(Object.entries(s.map).filter(([k]) => k !== midiaId)),
        };
      });
      // T266: NUNCA engolir erro em silêncio (D-230) — expõe no estado para
      // o StatusReactionControl mostrar mensagem de retry.
      const msg = mensagemAmigavel(err, "Falha ao atualizar status");
      set({ lastError: msg });
    }
  },

  setReaction: async (midiaId, reacao) => {
    const prev = get().map[midiaId];
    if (!prev) return;
    set((s) => ({
      map: { ...s.map, [midiaId]: { ...prev, reacao, motivoAbandono: prev.motivoAbandono } },
    }));
    try {
      await upsertInteracao(midiaId, { reacao });
    } catch (err) {
      set((s) => ({ map: { ...s.map, [midiaId]: prev } }));
      const msg = mensagemAmigavel(err, "Falha ao atualizar reação");
      set({ lastError: msg });
    }
  },

  setMotivo: async (midiaId, motivo) => {
    const prev = get().map[midiaId];
    if (!prev) return;
    set((s) => ({
      map: { ...s.map, [midiaId]: { ...prev, motivoAbandono: motivo } },
    }));
    try {
      await upsertInteracao(midiaId, { motivoAbandono: motivo });
    } catch (err) {
      set((s) => ({ map: { ...s.map, [midiaId]: prev } }));
      const msg = mensagemAmigavel(err, "Falha ao atualizar motivo");
      set({ lastError: msg });
    }
  },
}));
