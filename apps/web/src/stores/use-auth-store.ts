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
  trialEnded?: boolean;
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
  trialEnded?: boolean;
  watchlist_limit?: number | null;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /**
   * D-619 (P0): já tentamos descobrir a sessão?
   *
   * Sem este flag não havia como distinguir **"é visitante"** de **"ainda não sei"** — e
   * as telas tratavam os dois como visitante. Resultado medido: com sessão válida, um F5
   * em `/dashboard`, `/historico`, `/listas`, `/listas/[slug]` ou `/user/data` mostrava
   * "Entre para ver seu dashboard", o header mostrava "Entrar/Cadastrar" e o checkout
   * mandava para o login. A causa: só o `ProtectedPage` chamava `fetchMe()`.
   *
   * Agora o `AuthHydrator` (no layout do locale) chama uma vez, e as telas esperam
   * `hydrated` antes de decidir entre "carregando" e "visitante".
   */
  hydrated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; code?: string; status?: number }>;
  register: (
    name: string,
    email: string,
    password: string,
    aceitouTermos: boolean,
    inviteCode?: string,
    locale?: string,
  ) => Promise<{ success: boolean; error?: string; needsVerification?: boolean; status?: number }>;
  logout: () => Promise<void>;
  /** `force` refaz a consulta mesmo já hidratado (usado no login). */
  fetchMe: (opts?: { force?: boolean }) => Promise<void>;
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
    trialEnded: apiUser.trialEnded,
    watchlistLimit: apiUser.watchlist_limit,
    createdAt: apiUser.created_at,
  };
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  hydrated: false,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<{
        usuario: { id: string; email: string; nome: string | null };
        csrf_token?: string;
      }>("/api/v1/auth/login", { email, password }, { auth: false });
      if (data.csrf_token) setCsrfToken(data.csrf_token);
      await get().fetchMe({ force: true });
      // T130: Set flag cookie for SSR auth detection (non-PII)
      if (typeof document !== "undefined") {
        document.cookie = `mr_auth=1; SameSite=Lax; Secure; Path=/; max-age=86400`;
      }
      return { success: true };
    } catch (e) {
      if (e instanceof ApiError) {
        const msg = e.message || "Credenciais inválidas.";
        const code = (e.body as { code?: string } | undefined)?.code;
        set({ isLoading: false, error: msg });
        return { success: false, error: msg, code, status: e.status };
      }
      set({ isLoading: false, error: "Erro ao fazer login." });
      return { success: false, error: "Erro ao fazer login." };
    }
  },

  register: async (name, email, password, aceitouTermos, inviteCode?, locale?) => {
    set({ isLoading: true, error: null });
    try {
      const payload: Record<string, string | boolean> = {
        nome: name,
        email,
        password,
        aceitouTermos,
      };
      if (inviteCode) payload.inviteCode = inviteCode;
      if (locale) payload.locale = locale;
      await api.post("/api/v1/auth/register", payload, { auth: false });
      // Auto-login. T360: se o email ainda não foi verificado (Resend),
      // o login devolve 403 EMAIL_NOT_VERIFIED → sinaliza para o form.
      const loginResult = await get().login(email, password);
      if (!loginResult.success) {
        set({ isLoading: false });
        if (loginResult.code === "EMAIL_NOT_VERIFIED") {
          return { success: true, needsVerification: true };
        }
        return { success: false, error: loginResult.error };
      }
      return { success: true, needsVerification: false };
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
    set({ user: null, isAuthenticated: false, isLoading: false, error: null, hydrated: true });
  },

  fetchMe: async (opts) => {
    // Dedupe (D-619): quem já sabe quem é não consulta de novo — evita duas requisições
    // por página, porque `ProtectedPage` e `AuthHydrator` chamam os dois.
    if (get().hydrated && !opts?.force) return;
    set({ isLoading: true });
    try {
      const me = await api.get<MeResponse>("/api/v1/auth/me");
      set({
        user: mapUser(me),
        isAuthenticated: true,
        isLoading: false,
        error: null,
        hydrated: true,
      });
    } catch (e) {
      if (e instanceof SessionExpiredError || (e instanceof ApiError && e.status === 401)) {
        // Definitivo: não há sessão.
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          hydrated: true,
        });
      } else {
        // Falha de rede/5xx **não** é prova de que não há sessão — mas marcamos `hydrated`
        // para não repetir a consulta em laço. O estado segue "não autenticado" (piso seguro).
        set({ isLoading: false, hydrated: true });
      }
    }
  },

  setInitialUser: (name: string) => {
    set({
      user: { id: "ssr", email: "", name, avatarUrl: null },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      hydrated: true,
    });
  },
}));
