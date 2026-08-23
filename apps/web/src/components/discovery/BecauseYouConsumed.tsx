import { cookies } from "next/headers";
import { BecauseYouConsumedClient } from "./BecauseYouConsumedClient";

/**
 * BecauseYouConsumed (T405/D-401 lote b) — SERVER COMPONENT. Lê a sessão via
 * cookie no servidor; null para visitante (zero custo). Ilha client só para
 * logado.
 */
export async function BecauseYouConsumed() {
  const sess = (await cookies()).get("sess")?.value;
  if (!sess) return null;
  return <BecauseYouConsumedClient />;
}
