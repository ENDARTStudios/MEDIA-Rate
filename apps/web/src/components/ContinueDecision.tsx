import { cookies } from "next/headers";
import { ContinueDecisionClient } from "./ContinueDecisionClient";

/**
 * ContinueDecision (T405/D-401 lote b) — SERVER COMPONENT. Lê a sessão via
 * cookie no servidor e retorna null para visitante (zero custo de execução/
 * hidratação/zustand). Só monta a ilha client para usuário logado.
 */
export async function ContinueDecision() {
  const sess = (await cookies()).get("sess")?.value;
  if (!sess) return null;
  return <ContinueDecisionClient />;
}
