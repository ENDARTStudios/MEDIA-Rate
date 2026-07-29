import { cookies } from "next/headers";

const API_BASE = process.env.API_PROXY_TARGET || "https://media-rate-production.up.railway.app";

interface ServerAuthResult {
  isAuthenticated: boolean;
  userName: string | null;
}

export async function getServerAuth(): Promise<ServerAuthResult> {
  try {
    const cookieStore = await cookies();
    const sessToken = cookieStore.get("sess")?.value;
    if (!sessToken) return { isAuthenticated: false, userName: null };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Cookie: `sess=${sessToken}` },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { isAuthenticated: false, userName: null };

    const data = await res.json();
    const nome = data?.usuario?.nome || data?.nome || null;

    return {
      isAuthenticated: true,
      userName: nome,
    };
  } catch {
    return { isAuthenticated: false, userName: null };
  }
}
