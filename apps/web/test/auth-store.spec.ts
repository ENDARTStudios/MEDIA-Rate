import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAuthStore } from "../src/stores/use-auth-store";
import * as http from "../src/lib/http";

function mockApi() {
  vi.spyOn(http.api, "post").mockImplementation(async () => ({}));
  vi.spyOn(http.api, "get").mockImplementation(async () => ({
    id: "u1",
    email: "test@test.com",
    nome: "Test",
  }));
}

function mockApiError(status: number, message: string) {
  vi.spyOn(http.api, "post").mockRejectedValue(new http.ApiError(status, message));
}

function mockMeExpired() {
  vi.spyOn(http.api, "get").mockRejectedValue(new http.SessionExpiredError());
}

describe("Auth Store (T052)", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
    vi.restoreAllMocks();
    // Limpar localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("login chama api.post + api.get(/me)", async () => {
    const postSpy = vi.spyOn(http.api, "post").mockResolvedValue({} as never);
    const getSpy = vi
      .spyOn(http.api, "get")
      .mockResolvedValue({ id: "u1", email: "t@t.com", nome: "User" } as never);

    const result = await useAuthStore.getState().login("t@t.com", "pass");
    expect(result.success).toBe(true);
    expect(postSpy).toHaveBeenCalledWith(
      "/api/v1/auth/login",
      { email: "t@t.com", password: "pass" },
      { auth: false },
    );
    expect(getSpy).toHaveBeenCalledWith("/api/v1/auth/me");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe("t@t.com");
  });

  it("login com erro → success=false + error message", async () => {
    mockApiError(401, "Credenciais inválidas.");
    const result = await useAuthStore.getState().login("x", "x");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Credenciais inválidas.");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("register chama api.post(/register) + login automatica", async () => {
    const postSpy = vi.spyOn(http.api, "post").mockResolvedValue({});
    const getSpy = vi
      .spyOn(http.api, "get")
      .mockResolvedValue({ id: "u1", email: "t@t.com", nome: "User" });

    const result = await useAuthStore.getState().register("User", "t@t.com", "pass", true);
    expect(result.success).toBe(true);
    // Deve ter chamado /register E /login
    const calls = postSpy.mock.calls;
    expect(calls.some((c) => (c[0] as string) === "/api/v1/auth/register")).toBe(true);
    expect(calls.some((c) => (c[0] as string) === "/api/v1/auth/login")).toBe(true);
    expect(getSpy).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("register com erro → success=false", async () => {
    mockApiError(409, "Email já cadastrado.");
    const result = await useAuthStore.getState().register("User", "x@x.com", "pass", true);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Email já cadastrado.");
  });

  it("fetchMe com sucesso → user populado", async () => {
    vi.spyOn(http.api, "get").mockResolvedValue({ id: "u2", email: "e@e.com", nome: "N" });
    await useAuthStore.getState().fetchMe();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.id).toBe("u2");
  });

  it("fetchMe com SessionExpiredError → limpa estado", async () => {
    mockMeExpired();
    useAuthStore.setState({
      user: { id: "x", email: "x", name: "x", avatarUrl: null },
      isAuthenticated: true,
    });
    await useAuthStore.getState().fetchMe();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("logout chama api.post(/logout) e limpa estado", async () => {
    const postSpy = vi.spyOn(http.api, "post").mockResolvedValue({});
    useAuthStore.setState({
      user: { id: "x", email: "x", name: "x", avatarUrl: null },
      isAuthenticated: true,
    });
    await useAuthStore.getState().logout();
    expect(postSpy).toHaveBeenCalledWith("/api/v1/auth/logout");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("sem localStorage para auth apos login", async () => {
    mockApi();
    await useAuthStore.getState().login("t@t.com", "pass");
    // O Zustand persist foi removido — localStorage não deve ter chave de auth
    const stored = localStorage.getItem("mediarate-auth");
    expect(stored).toBeNull();
  });

  it("sem localStorage apos register", async () => {
    mockApi();
    await useAuthStore.getState().register("A", "b@b.com", "pass", true);
    expect(localStorage.getItem("mediarate-auth")).toBeNull();
  });
});
