/**
 * T454 (D-507) — decisão server-side de plataforma para o dual-deploy
 * Vercel ↔ Cloudflare. Fonte da verdade da flag: PostHog
 * (`cloudflare_migration`, id 886344) via endpoint de local_evaluation,
 * com cache de 5 min e **fallback OFF** (Vercel) para qualquer ausência
 * ou erro — nunca lançar; roteamento não pode derrubar a request.
 *
 * A FUNÇÃO de bucket é a pura `decidirPlataforma()` (cf-routing.ts,
 * testada em test/cf-routing.spec.ts). Este módulo só busca o valor da
 * flag e o expõe ao middleware (hook `x-mr-platform`), que é o ponto de
 * roteamento do rollout (DNS/proxy decide o destino; middleware
 * instrumenta a decisão por request).
 */
import { decidirPlataforma, type FlagValue } from "./cf-routing";

interface LocalEvaluationFlag {
  key?: string;
  deleted?: boolean;
  active?: boolean;
  filters?: {
    groups?: { rollout_percentage?: number }[];
  };
}

const FLAG_KEY = "cloudflare_migration";
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { valor: FlagValue; expira: number } | null = null;

/**
 * Extrai o valor efetivo de UM flag booleana do payload de local_evaluation:
 * - rollout_percentage do primeiro grupo → número (0-100);
 * - flag ativa sem grupos → true;
 * - flag inativa/deletada/ausente → false (default OFF).
 * Puramente sintática — testável sem rede.
 */
export function flagFromLocalEvaluation(payload: unknown): FlagValue {
  const flags = (payload as { flags?: LocalEvaluationFlag[] })?.flags;
  if (!Array.isArray(flags)) return false;
  const flag = flags.find((f) => f?.key === FLAG_KEY && !f.deleted && f.active);
  if (!flag) return false;
  const groups = flag.filters?.groups;
  if (Array.isArray(groups) && groups.length > 0) {
    const pct = groups[0]?.rollout_percentage;
    return typeof pct === "number" && Number.isFinite(pct) ? pct : false;
  }
  return true;
}

async function buscarFlag(): Promise<FlagValue> {
  if (cache && Date.now() < cache.expira) return cache.valor;

  const chave = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projeto = process.env.POSTHOG_PROJECT_ID?.trim();
  const host = process.env.POSTHOG_HOST?.trim() || "https://us.posthog.com";
  let valor: FlagValue = false; // default OFF (D-507): sem chave/projeto → Vercel
  if (chave && projeto) {
    try {
      const res = await fetch(`${host}/api/projects/${projeto}/feature_flags/local_evaluation`, {
        headers: { Authorization: `Bearer ${chave}` },
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) valor = flagFromLocalEvaluation(await res.json());
    } catch {
      valor = false; // fail-closed: erro de rede/escopo → Vercel
    }
  }
  cache = { valor, expira: Date.now() + CACHE_TTL_MS };
  return valor;
}

/** "cloudflare" | "vercel" para o request corrente (bucket estável por id). */
export async function plataformaParaRequest(distinctId: string): Promise<"cloudflare" | "vercel"> {
  return decidirPlataforma(await buscarFlag(), distinctId) ? "cloudflare" : "vercel";
}
