import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { apiFetch, api, getCsrfToken, ApiError, SessionExpiredError } from "../src/lib/http";

const FAKE_BASE = "https://api.example.com";

describe("HTTP Client (T051)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = FAKE_BASE;
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET usa credentials: include", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    await api.get("/health");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("GET");
  });

  it("POST usa credentials + body JSON", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    await api.post("/test", { foo: "bar" });
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
    expect(init.body).toBe('{"foo":"bar"}');
  });

  it("mutacao (POST) anexa X-CSRF-Token do cookie", async () => {
    Object.defineProperty(document, "cookie", {
      get: vi.fn().mockReturnValue("csrf_token=test-csrf-value-64chars-long-token-here-ok"),
      configurable: true,
    });
    fetchSpy.mockResolvedValueOnce(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    await api.post("/test", {});
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-CSRF-Token"]).toBe("test-csrf-value-64chars-long-token-here-ok");
  });

  it("GET NAO anexa X-CSRF-Token", async () => {
    Object.defineProperty(document, "cookie", {
      get: vi.fn().mockReturnValue("csrf_token=some-token"),
      configurable: true,
    });
    fetchSpy.mockResolvedValueOnce(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    await api.get("/health");
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string> | undefined;
    expect(headers?.["X-CSRF-Token"]).toBeUndefined();
  });

  it("401 em rota autenticada → redirect para login + SessionExpiredError", async () => {
    const locationMock = vi.fn();
    Object.defineProperty(window, "location", {
      get: vi.fn(() => ({ pathname: "/pt-BR/dashboard", href: "" })),
      set: locationMock,
    });
    fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    await expect(api.get("/api/v1/me")).rejects.toThrow(SessionExpiredError);
  });

  it("401 em login → NAO redirect (trata como erro normal)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('{"message":"Invalid credentials"}', {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(api.post("/api/v1/auth/login", { email: "x", password: "x" })).rejects.toThrow(
      ApiError,
    );
  });

  it("4xx/5xx → lance ApiError com status + mensagem", async () => {
    fetchSpy.mockResolvedValueOnce(
      Response.json({ message: "Erro de validação" }, { status: 422 }),
    );
    try {
      await api.post("/api/v1/register", {});
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(422);
    }
  });

  it("NEXT_PUBLIC_API_URL vazio em producao → lance erro", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getCsrfToken()).not.toThrow();
    vi.unstubAllEnvs();
  });

  it("getCsrfToken retorna valor do cookie", () => {
    Object.defineProperty(document, "cookie", {
      get: vi.fn().mockReturnValue("other=val; csrf_token=abc123def; more=stuff"),
      configurable: true,
    });
    expect(getCsrfToken()).toBe("abc123def");
  });

  it("getCsrfToken retorna null sem cookie", () => {
    Object.defineProperty(document, "cookie", {
      get: vi.fn().mockReturnValue("other=val"),
      configurable: true,
    });
    expect(getCsrfToken()).toBeNull();
  });
});
