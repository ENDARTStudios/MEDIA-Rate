"use client";

import { create } from "zustand";
import { api, ApiError, SessionExpiredError } from "@/lib/http";

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
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

function mapUser(apiUser: { id: string; email: string; nome: string | null } | null): User | null {
  if (!apiUser) return null;
  return { id: apiUser.id, email: apiUser.email, name: apiUser.nome ?? "", avatarUrl: null };
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await api.post<{ usuario: { id: string; email: string; nome: string | null } }>(
        "/api/v1/auth/login",
        { email, password },
        { auth: false },
      );
      // Login sets cookies (sess + csrf_token) via Set-Cookie header.
      // Fetch the user profile using the session cookie.
      await get().fetchMe();
      return { success: true };
    } catch (e) {
      if (e instanceof ApiError) {
        const msg = e.message || "Credenciais inválidas.";
        set({ isLoading: false, error: msg });
        return { success: false, error: msg };
      }
      set({ isLoading: false, error: "Erro ao fazer login." });
      return { success: false, error: "Erro ao fazer login." };
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/auth/register", { nome: name, email, password }, { auth: false });
      // Auto-login after registration (same session context).
      await get().login(email, password);
      return { success: true };
    } catch (e) {
      set({ isLoading: false });
      if (e instanceof ApiError) {
        const msg = e.message || "Erro ao criar conta.";
        set({ error: msg });
        return { success: false, error: msg };
      }
      set({ error: "Erro ao criar conta." });
      return { success: false, error: "Erro ao criar conta." };
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // Mesmo com erro de rede, limpar estado local.
    }
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const me = await api.get<{ id: string; email: string; nome: string | null }>("/api/v1/auth/me");
      set({ user: mapUser(me), isAuthenticated: true, isLoading: false, error: null });
    } catch (e) {
      if (e instanceof SessionExpiredError || (e instanceof ApiError && e.status === 401)) {
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      } else {
        set({ isLoading: false });
      }
    }
  },
}));
