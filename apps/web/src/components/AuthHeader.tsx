import { cookies } from "next/headers";
import { Navbar } from "./Navbar";

const API_BASE = process.env.API_PROXY_TARGET || "https://media-rate-production.up.railway.app";

async function getServerAuth() {
  try {
    const cookieStore = await cookies();
    const sessToken = cookieStore.get("sess")?.value;
    if (!sessToken) return { isAuthenticated: false as const, userName: null };

    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Cookie: `sess=${sessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return { isAuthenticated: false as const, userName: null };

    const data = await res.json();
    const nome = data?.usuario?.nome || data?.nome || null;
    return {
      isAuthenticated: true as const,
      userName: nome,
    };
  } catch {
    return { isAuthenticated: false as const, userName: null };
  }
}

export async function AuthHeader() {
  const auth = await getServerAuth();
  return <Navbar initialAuth={auth} />;
}
