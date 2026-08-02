"use client";

import { create } from "zustand";
import { api, ApiError } from "@/lib/http";

interface WatchlistEntry {
  id: string;
  mediaId: string;
  midia_id?: string;
  status: string;
  coluna?: string;
  media?: any;
  addedAt?: string;
  created_at?: string;
}

interface WatchlistState {
  entries: WatchlistEntry[];
  isLoading: boolean;
  error: Error | string | null;
  fetchWatchlist: () => Promise<void>;
  addToWatchlist: (mediaId: string, status?: string) => Promise<void>;
  moveItem: (entryId: string, newStatus: string) => Promise<void>;
  removeItem: (entryId: string) => Promise<void>;
  isInWatchlist: (mediaId: string) => boolean;
  getEntryStatus: (mediaId: string) => string | null;
}

export const useWatchlistStore = create<WatchlistState>()((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchWatchlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<{ items?: WatchlistEntry[] }>("/api/v1/watchlist");
      const items = data.items ?? (Array.isArray(data) ? data : []);
      const mapped = items.map((e: any) => ({
        id: String(e.id),
        mediaId: String(e.mediaId ?? e.midia_id ?? e.media?.id ?? ""),
        midia_id: e.midia_id,
        status: e.status ?? e.coluna ?? "WANT",
        coluna: e.coluna ?? e.status,
        media: e.media ?? null,
        addedAt: e.addedAt ?? e.created_at,
        created_at: e.created_at,
      }));
      set({ entries: mapped, isLoading: false });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erro ao carregar watchlist";
      set({ error: err instanceof Error ? err : msg, isLoading: false });
      throw err;
    }
  },

  addToWatchlist: async (mediaId, status) => {
    set({ error: null });
    // T136: Optimistic update — add entry immediately so UI reflects change
    const optimisticEntry: WatchlistEntry = {
      id: "opt-" + Date.now(),
      mediaId: String(mediaId),
      status: status || "WANT",
    };
    set((state) => ({ entries: [...state.entries, optimisticEntry] }));
    try {
      await api.post("/api/v1/watchlist", {
        midia_id: mediaId,
        coluna: status || "WANT",
      });
      await get().fetchWatchlist();
    } catch (err) {
      // Rollback optimistic update
      set((state) => ({ entries: state.entries.filter((e) => e.id !== optimisticEntry.id) }));
      const msg = err instanceof ApiError ? err.message : "Erro ao adicionar à watchlist";
      set({ error: msg });
      throw err;
    }
  },

  moveItem: async (entryId, newStatus) => {
    set({ error: null });
    try {
      await api.patch(`/api/v1/watchlist/${entryId}/move`, { coluna: newStatus });
      await get().fetchWatchlist();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erro ao mover item";
      set({ error: msg });
      throw err;
    }
  },

  removeItem: async (entryId) => {
    set({ error: null });
    try {
      await api.delete(`/api/v1/watchlist/${entryId}`);
      await get().fetchWatchlist();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erro ao remover item";
      set({ error: msg });
      throw err;
    }
  },

  isInWatchlist: (mediaId) => {
    return get().entries.some(
      (e) => e.mediaId === mediaId || e.midia_id === mediaId || (e.media && e.media.id === mediaId),
    );
  },

  getEntryStatus: (mediaId) => {
    const entry = get().entries.find(
      (e) => e.mediaId === mediaId || e.midia_id === mediaId || (e.media && e.media.id === mediaId),
    );
    return entry ? (entry.status ?? entry.coluna ?? null) : null;
  },
}));
