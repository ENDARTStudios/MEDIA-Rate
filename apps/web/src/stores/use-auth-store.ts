"use client";

import { create } from "zustand";
import { api, ApiError, SessionExpiredError, setCsrfToken } from "@/lib/http";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  plan?: "FREE" | "PLUS" | "PREMIUM";
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  watchlistLimit?: number | null;
  /** T321: membro desde (ISO) — exibido no Perfil. */
  createdAt?: string;
}

interface MeResponse {
  id: string;
  email: string;
  nome: string | null;
  plano?: "FREE" | "PLUS" | "PREMIUM";
  status?: string;
  trial_ends_at?: string | null;
  watchlist_limit?: number | null;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    aceitouTermos: boolean,
    inviteCode?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setInitialUser: (name: string) => void;
}

function mapUser(apiUser: MeResponse | null): User | null {
  if (!apiUser) return null;
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.nome ?? "",
    avatarUrl: null,
    plan: apiUser.plano,
    subscriptionStatus: apiUser.status,
    trialEndsAt: apiUser.trial_ends_at,
    watchlistLimit: apiUser.watchlist_limit,
    createdAt: apiUser.created_at,
  };
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<{
        usuario: { id: string; email: string; nome: string | null };
        csrf_token?: string;
      }>("/api/v1/auth/login", { email, password }, { auth: false });
      if (data.csrf_token) setCsrfToken(data.csrf_token);
      await get().fetchMe();
      // T130: Set flag cookie for SSR auth detection (non-PII)
      if (typeof document !== "undefined") {
        document.cookie = `mr_auth=1; SameSite=Lax; Secure; Path=/; max-age=86400`;
      }
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

  register: async (name, email, password, aceitouTermos, inviteCode?) => {
    set({ isLoading: true, error: null });
    try {
      const payload: Record<string, string | boolean> = {
        nome: name,
        email,
        password,
        aceitouTermos,
      };
      if (inviteCode) payload.inviteCode = inviteCode;
      await api.post("/api/v1/auth/register", payload, { auth: false });
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
      // Logout local continua mesmo se a chamada à API falhar.
    }
    setCsrfToken(null);
    // T130: Clear auth flag cookie
    if (typeof document !== "undefined") {
      document.cookie = `mr_auth=; SameSite=Lax; Secure; Path=/; max-age=0`;
    }
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const me = await api.get<MeResponse>("/api/v1/auth/me");
      set({ user: mapUser(me), isAuthenticated: true, isLoading: false, error: null });
    } catch (e) {
      if (e instanceof SessionExpiredError || (e instanceof ApiError && e.status === 401)) {
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      } else {
        set({ isLoading: false });
      }
    }
  },

  setInitialUser: (name: string) => {
    set({
      user: { id: "ssr", email: "", name, avatarUrl: null },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },
}));
