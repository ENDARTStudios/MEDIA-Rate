import { timingSafeEqual } from "node:crypto";

/**
 * Token admin para rotas administrativas (invite, metrics).
 *
 * - Em produção, ADMIN_TOKEN é OBRIGATÓRIO — falha no boot se ausente
 *   (nenhum fallback hardcoded: o valor "media-rate-admin-2026" foi
 *   removido por estar exposto no repositório público).
 * - Em dev/test, usa um valor local claro, que NUNCA deve ser usado em produção.
 */
export function getAdminToken(): string {
  const token = process.env.ADMIN_TOKEN;
  if (token && token.length > 0) return token;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_TOKEN é obrigatório em produção. Defina a variável de ambiente.");
  }
  return "dev-admin-token-not-for-production";
}

/**
 * Comparação timing-safe entre o token fornecido no header e o esperado.
 */
export function isAdminTokenValid(supplied: string | undefined): boolean {
  if (!supplied) return false;
  const expected = getAdminToken();
  const a = Buffer.from(supplied, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.byteLength !== b.byteLength) return false;
  return timingSafeEqual(a, b);
}
