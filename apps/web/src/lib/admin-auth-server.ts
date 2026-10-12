import { cookies } from "next/headers";

const API_BASE = process.env.API_PROXY_TARGET || "https://media-rate-production.up.railway.app";

export interface AdminGate {
  autenticado: boolean;
  isAdmin: boolean;
}

/**
 * T202 — gate server-side da área admin (docs/08-security/ADMIN_SECURITY.md:
 * deny-by-default antes de renderizar qualquer UI administrativa).
 *
 * A fonte de verdade é o RolesGuard da API: fazemos um probe GET em
 * `/api/v1/admin/backfills/status` (`@Roles("ADMIN")`, síncrono e barato) com o
 * cookie `sess` do request. 200 = ADMIN; 403 = autenticado sem ADMIN;
 * 401/outros/erro/timeout = FAIL-CLOSED (tratado como anônimo — nunca renderiza
 * a área admin por dúvida). Sem leitura direta de banco no edge e sem alterar a
 * API de autorização.
 */
export async function getServerAdminGate(): Promise<AdminGate> {
  try {
    const cookieStore = await cookies();
    const sessToken = cookieStore.get("sess")?.value;
    if (!sessToken) return { autenticado: false, isAdmin: false };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/api/v1/admin/backfills/status`, {
      headers: { Cookie: `sess=${sessToken}` },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 200) return { autenticado: true, isAdmin: true };
    if (res.status === 403) return { autenticado: true, isAdmin: false };
    return { autenticado: false, isAdmin: false };
  } catch {
    return { autenticado: false, isAdmin: false };
  }
}
