import { revalidatePath } from "next/cache";
import { isRevalidateTokenValid } from "@/lib/revalidate-auth";

/**
 * T447/D-441 — gatilho on-demand do ISR da home.
 *
 * O score-job roda 1×/semana (D-410) mas a home revalidava a cada 60s;
 * agora o ISR é horário (`revalidate = 3600`) e este endpoint invalida o
 * cache imediatamente após cada run do score-job. Chamado pela API
 * (Railway) ao concluir `executar()` — nunca pelo browser.
 *
 * POST /api/revalidate — header `x-revalidate-token` == REVALIDATE_SECRET.
 * Resposta sempre mínima (sem ecoar paths internos em erro).
 */
export async function POST(request: Request): Promise<Response> {
  const supplied = request.headers.get("x-revalidate-token");
  if (!isRevalidateTokenValid(supplied, process.env.REVALIDATE_SECRET ?? "")) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  // Invalida o layout raiz (cobre a home nos 3 locales de uma vez).
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true });
}

export async function GET(): Promise<Response> {
  return Response.json({ revalidated: false }, { status: 405 });
}
