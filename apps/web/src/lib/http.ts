const SESSION_EXPIRED_EVENT = "mediarate:session-expired";

// T057: cross-domain fix — document.cookie nao le cookies de railway.app.
// Armazenamos em memoria o csrf_token capturado do login response.
let _csrfToken: string | null = null;
export function setCsrfToken(token: string | null) { _csrfToken = token; }

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada.");
    this.name = "SessionExpiredError";
    // Dispara evento para o store limpar estado (T052)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
  }
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_API_URL não definida em produção.");
    }
    return "http://localhost:4000";
  }
  return url.replace(/\/+$/, "");
}

export function getCsrfToken(): string | null {
  if (_csrfToken) return _csrfToken;
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? match[1]! : null;
}

function isMutation(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function isAuthRoute(path: string): boolean {
  return /\/auth\/(login|register|forgot-password|reset-password)/i.test(path);
}

export interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const { auth = true, body, ...init } = options;
  const method = (init.method ?? "GET").toUpperCase();

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (isMutation(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }

  headers["Accept"] = "application/json";

  const res = await fetch(url, {
    ...init,
    method,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !isAuthRoute(path)) {
    if (typeof window !== "undefined") {
      const locale = window.location.pathname.split("/")[1] ?? "";
      const loginPath = locale.length === 2 ? `/${locale}/login` : "/login";
      window.location.href = loginPath;
    }
    throw new SessionExpiredError();
  }

  let data: unknown;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : res.statusText;
    throw new ApiError(res.status, msg, data);
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE", ...opts }),
};
