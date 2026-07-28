const SESSION_EXPIRED_EVENT = "mediarate:session-expired";

// T057 cross-domain fix: sessionStorage sobrevive ao Next.js SSR→client.
// csrf_token nao e credencial de sessao — e seguro em sessionStorage.
const CSRF_KEY = "mediarate:csrf";
function readCsrfStore(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try { return sessionStorage.getItem(CSRF_KEY); } catch { return null; }
}
function writeCsrfStore(token: string | null) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (token) sessionStorage.setItem(CSRF_KEY, token);
    else sessionStorage.removeItem(CSRF_KEY);
  } catch {}
}

export function setCsrfToken(token: string | null) { writeCsrfStore(token); }

export function getCsrfToken(): string | null {
  const stored = readCsrfStore();
  if (stored) return stored;
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? m[1]! : null;
}

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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
  }
}

function getBaseUrl(): string {
  // T098: In production (Vercel), use RELATIVE URL so browser calls go through
  // the same-origin proxy rewrite (/api/* → Railway). This makes cookies first-party.
  if (process.env.NODE_ENV === "production") return "";

  // In dev, use local backend (fallback to localhost:4000).
  const url = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";
  return url.replace(/\/+$/, "");
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
  get: <T = unknown>(path: string, opts?: FetchOptions) => apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) => apiFetch<T>(path, { ...opts, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) => apiFetch<T>(path, { ...opts, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: FetchOptions) => apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: FetchOptions) => apiFetch<T>(path, { ...opts, method: "DELETE", ...opts }),
};
