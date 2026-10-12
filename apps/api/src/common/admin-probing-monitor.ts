import { createHash } from "node:crypto";

/** T203 — categorias de negação monitoradas na superfície admin. */
export type NegacaoAdmin = "NEGADO" | "RATE_LIMIT";

export interface RegistroNegacaoAdmin {
  /** true quando a contagem na janela EXCEDE o limite (log por excedente). */
  repetida: boolean;
  contagem: number;
  /** sha256-32 da sessão (nunca o token cru, nunca IP/user-agent real). */
  hash: string;
}

export interface AdminProbingMonitorOpcoes {
  now?: () => number;
  /** Janela deslizante de contagem (default 60s). */
  janelaMs?: number;
  /** Nº de negações toleradas por janela antes de marcar "repetida" (default 5). */
  limite?: number;
}

/**
 * T203 — anti-probing da superfície admin (achado ADMIN_RATE_LIMIT_WEAK, T201).
 *
 * Conta, por janela deslizante em memória, as negações de acesso admin
 * (403 do RolesGuard e 429 do rate limit) por **hash de sessão + rota + tipo**.
 * O chamador decide logar quando `repetida` (excedente) — o registro é
 * sanitizado por construção: a chave nunca contém o token de sessão cru, IP,
 * user-agent ou PII (o `req.ip` do Fastify NÃO entra aqui; autenticado é
 * identificado só pelo hash da sessão; sem sessão vira "anonima").
 * Memória com higiene (mapa pequeno) — não substitui autorização nem audit.
 */
export class AdminProbingMonitor {
  private readonly now: () => number;
  private readonly janelaMs: number;
  private readonly limite: number;
  private readonly memoria = new Map<string, number[]>();

  constructor(opcoes: AdminProbingMonitorOpcoes = {}) {
    this.now = opcoes.now ?? (() => Date.now());
    this.janelaMs = opcoes.janelaMs ?? 60_000;
    this.limite = opcoes.limite ?? 5;
  }

  registrar(tipo: NegacaoAdmin, route: string, sessToken?: string): RegistroNegacaoAdmin {
    const agora = this.now();
    const hash = sessToken
      ? createHash("sha256").update(sessToken).digest("hex").slice(0, 32)
      : "anonima";
    const chave = `${tipo}:${hash}:${route}`;
    const janelaMinima = agora - this.janelaMs;
    const entradas = (this.memoria.get(chave) ?? []).filter((t) => t > janelaMinima);
    entradas.push(agora);
    if (this.memoria.size > 20_000) {
      // Higiene: evita crescimento sem limite em rajadas de chaves distintas.
      for (const [k, v] of this.memoria) {
        if (v.every((t) => t <= janelaMinima)) this.memoria.delete(k);
      }
    }
    this.memoria.set(chave, entradas);
    return { repetida: entradas.length > this.limite, contagem: entradas.length, hash };
  }
}

/** Singleton compartilhado (GlobalExceptionFilter 403 + errorResponseBuilder 429). */
export const adminProbingMonitor = new AdminProbingMonitor();
