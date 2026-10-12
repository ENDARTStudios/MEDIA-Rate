import { cookies } from "next/headers";

const API_BASE = process.env.API_PROXY_TARGET || "https://media-rate-production.up.railway.app";

const PROBE_GATE = `${API_BASE}/api/v1/admin/gate`;
const PROBE_FALLBACK = `${API_BASE}/api/v1/admin/backfills/status`;

export interface AdminGate {
  autenticado: boolean;
  isAdmin: boolean;
}

interface ProbeResultado {
  /** 200/403/401/404/5xx; null = erro de rede/timeout/JSON inválido. */
  status: number | null;
}

async function probe(url: string, sessToken: string): Promise<ProbeResultado> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(url, {
      headers: { Cookie: `sess=${sessToken}` },
      cache: "no-store",
      signal: controller.signal,
    });
    // Payload mínimo validado quando 200: JSON deve ser objeto (gate retorna {ok:true}).
    if (res.status === 200) {
      const data: unknown = await res.json();
      if (data === null || typeof data !== "object") return { status: null };
    }
    return { status: res.status };
  } catch {
    return { status: null };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * T206 — gate server-side da área admin (ADMIN_SECURITY: deny-by-default).
 *
 * Fonte de verdade é o RolesGuard da API. Probe PRIMÁRIO: GET /api/v1/admin/gate
 * (endpoint dedicado, `@Roles("ADMIN")`, payload mínimo {ok:true}); FALLBACK:
 * GET /api/v1/admin/backfills/status apenas quando o gate novo responde 404
 * (compatibilidade de rollout — ex.: ambiente ainda sem a rota).
 *
 * Semântica: 200 = ADMIN; 403 = autenticado sem ADMIN (negação EXPLÍCITA — sem
 * fallback); 401/outros/erro/timeout/JSON inválido = FAIL-CLOSED (tratado como
 * anônimo — nunca renderiza a área admin por dúvida). Sem leitura de banco no
 * edge e sem alterar a API de autorização.
 */
export async function getServerAdminGate(): Promise<AdminGate> {
  try {
    const cookieStore = await cookies();
    const sessToken = cookieStore.get("sess")?.value;
    if (!sessToken) return { autenticado: false, isAdmin: false };

    const primario = await probe(PROBE_GATE, sessToken);
    if (primario.status === 200) return { autenticado: true, isAdmin: true };
    if (primario.status === 403) return { autenticado: true, isAdmin: false };
    if (primario.status !== 404) return { autenticado: false, isAdmin: false };

    // Compatibilidade de rollout: gate novo indisponível (404) → probe antigo.
    const fallback = await probe(PROBE_FALLBACK, sessToken);
    if (fallback.status === 200) return { autenticado: true, isAdmin: true };
    if (fallback.status === 403) return { autenticado: true, isAdmin: false };
    return { autenticado: false, isAdmin: false };
  } catch {
    return { autenticado: false, isAdmin: false };
  }
}
