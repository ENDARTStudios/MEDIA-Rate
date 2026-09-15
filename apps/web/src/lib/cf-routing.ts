/**
 * T463 (D-493) — decisão pura de plataforma para o rollout gradual da
 * migração Cloudflare (T454). Função PURA e síncrona: testável sem runtime
 * Next e sem PostHog. O wiring no middleware acontece na T454 — aqui só a
 * regra, com bucket determinístico.
 *
 * Contrato (espelha docs/DEPLOY_CLOUDFLARE.md, DRAFT):
 * - `false`/null/undefined → Vercel (default OFF: comportamento atual).
 * - `true` → Cloudflare (rollout total).
 * - número (0-100) → percentual de rollout: bucket determinístico pelo
 *   hash FNV-1a do `distinctId` — o MESMO usuário sempre cai no mesmo lado.
 * - valor inválido (NaN, Infinity, <0, >100, string…) → Vercel (fail-closed).
 */

export type FlagValue = boolean | number | null | undefined;

/** Bucket estável 0-99 para um distinctId (FNV-1a 32-bit, sem dependências). */
export function bucketDoUsuario(distinctId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < distinctId.length; i++) {
    hash ^= distinctId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function decidirPlataforma(flag: FlagValue, distinctId: string): boolean {
  if (flag === true) return true;
  if (flag === false || flag == null) return false;
  if (typeof flag === "number") {
    if (!Number.isFinite(flag) || flag <= 0) return false;
    if (flag >= 100) return true;
    return bucketDoUsuario(distinctId) < Math.floor(flag);
  }
  return false;
}
