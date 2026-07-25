"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

function getUsers(): Record<string, { name: string; password: string }> {
  try { return JSON.parse(localStorage.getItem("mediarate-users") || "{}"); } catch { return {}; }
}
function saveUsers(u: Record<string, unknown>) { localStorage.setItem("mediarate-users", JSON.stringify(u)); }

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        const users = getUsers();
        const found = users[email];
        if (!found) return { success: false, error: "Email não encontrado" };
        if (found.password !== password) return { success: false, error: "Senha incorreta" };
        set({ user: { id: email, name: found.name, email, avatarUrl: null }, isAuthenticated: true });
        return { success: true };
      },

      register: async (name, email, password) => {
        const users = getUsers();
        if (users[email]) return { success: false, error: "Este email já está cadastrado" };
        users[email] = { name, password };
        saveUsers(users);
        set({ user: { id: email, name, email, avatarUrl: null }, isAuthenticated: true });
        return { success: true };
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: "mediarate-auth", partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);
