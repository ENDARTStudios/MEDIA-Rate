/**
 * T184 — guardas de provisionamento de contas de teste (incidente 2026-10-11).
 *
 * Funções puras (sem I/O/rede/DB) usadas por `provision-test-users.ts` e
 * `seed.ts`, cobertas por `test/provision-test-users.spec.ts`. Objetivo:
 * impedir que contas `@mediarate.test` sejam criadas com senha fallback
 * pública ou com papel ADMIN fora de ambiente local.
 */

export const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Extrai o hostname de uma URL de banco; null se ausente/inválida. */
export function extrairHost(databaseUrl: string | undefined | null): string | null {
  if (!databaseUrl || typeof databaseUrl !== "string") return null;
  try {
    return new URL(databaseUrl).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return null;
  }
}

/** true somente para loopback (localhost/127.0.0.1/::1). */
export function ehAmbienteLocal(databaseUrl: string | undefined | null): boolean {
  const host = extrairHost(databaseUrl);
  return host !== null && HOSTS_LOCAIS.has(host);
}

export interface AvaliacaoAmbienteProvisao {
  local: boolean;
  bloqueado: boolean;
  motivo?: string;
  aviso?: string;
}

/**
 * Avalia se o provisionamento pode rodar. Ambiente não-local exige a flag
 * explícita `TEST_USERS_ALLOW_NONLOCAL=1` (autorização consciente); mesmo
 * autorizado, o papel ADMIN nunca é concedido fora de local.
 */
export function avaliarAmbienteProvisao(opts: {
  databaseUrl?: string | null;
  allowNonLocal?: string | null;
}): AvaliacaoAmbienteProvisao {
  const local = ehAmbienteLocal(opts.databaseUrl);
  if (local) return { local, bloqueado: false };
  if (String(opts.allowNonLocal ?? "").trim() !== "1") {
    return {
      local,
      bloqueado: true,
      motivo:
        "ambiente não-local sem TEST_USERS_ALLOW_NONLOCAL=1 (guarda T184 — incidente 2026-10-11)",
    };
  }
  return {
    local,
    bloqueado: false,
    aviso:
      "ambiente NÃO-local com flag explícita — papel ADMIN será ignorado e a senha deve vir de env (guarda T184)",
  };
}

/**
 * Resolve a senha do provisionamento a partir do env — SEM fallback público.
 * Lança erro sanitizado (nunca inclui o valor) se ausente/curta.
 */
export function resolverSenhaProvisao(env: Record<string, string | undefined>): string {
  const senha = (env.TEST_USERS_PASSWORD ?? "").trim();
  if (!senha) {
    throw new Error(
      "TEST_USERS_PASSWORD ausente: o fallback público foi removido (incidente 2026-10-11). Defina uma senha forte via env.",
    );
  }
  if (senha.length < 12) {
    throw new Error("TEST_USERS_PASSWORD fraca: mínimo de 12 caracteres exigido pela guarda T184.");
  }
  return senha;
}

/** ADMIN de contas de teste nunca é concedido fora de ambiente local. */
export function podeConcederAdmin(naoLocal: boolean): boolean {
  return !naoLocal;
}
