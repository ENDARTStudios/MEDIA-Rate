"use client";

import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  searchOpen: boolean;
  theme: "dark";
  toggleSidebar: () => void;
  toggleSearch: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  searchOpen: false,
  theme: "dark",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
}));
