"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WatchlistColumn {
  id: string;
  title: string;
  items: string[];
}

interface WatchlistState {
  columns: Record<string, WatchlistColumn>;
  addToColumn: (columnId: string, mediaId: string) => void;
  moveItem: (fromColumn: string, toColumn: string, mediaId: string) => void;
  removeItem: (columnId: string, mediaId: string) => void;
}

const DEFAULT_COLUMNS: Record<string, WatchlistColumn> = {
  want: { id: "want", title: "Quero ver", items: [] },
  watching: { id: "watching", title: "Assistindo", items: [] },
  completed: { id: "completed", title: "Completo", items: [] },
  dropped: { id: "dropped", title: "Abandonado", items: [] },
};

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      columns: DEFAULT_COLUMNS,
      addToColumn: (columnId, mediaId) =>
        set((s) => {
          const col = { ...s.columns[columnId] };
          if (!col.items.includes(mediaId)) col.items = [...col.items, mediaId];
          return { columns: { ...s.columns, [columnId]: col } };
        }),
      moveItem: (fromColumn, toColumn, mediaId) =>
        set((s) => ({
          columns: {
            ...s.columns,
            [fromColumn]: { ...s.columns[fromColumn], items: s.columns[fromColumn].items.filter((i) => i !== mediaId) },
            [toColumn]: { ...s.columns[toColumn], items: [...s.columns[toColumn].items, mediaId] },
          },
        })),
      removeItem: (columnId, mediaId) =>
        set((s) => ({
          columns: { ...s.columns, [columnId]: { ...s.columns[columnId], items: s.columns[columnId].items.filter((i) => i !== mediaId) } },
        })),
    }),
    { name: "mediarate-watchlist" }
  )
);
