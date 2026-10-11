/**
 * T193 (CodeQL js/clear-text-logging) — redator de valores sensíveis para logs.
 *
 * Lacuna coberta: o `redact` do Pino cobre PROPRIEDADES do log HTTP e o
 * `sanitizarPii` (D-543) cobre objetos, mas **mensagens soltas** (ex.: erro do
 * seed com `api_key=` embutida na URL) não passam por nenhum dos dois.
 *
 * Nível string: redige pares nome-valor sensíveis, headers Authorization/Cookie,
 * `Bearer <token>`, credenciais em URL de conexão (preserva scheme/host) e e-mails
 * (reuso do `mascararEmail`/D-543); trunca textos longos.
 * Nível objeto: cópia recursiva com chaves sensíveis → `[REDACTED]` e TODA string
 * passando pelo redator de texto (seguro contra ciclos, profundidade limitada).
 * Nunca imprime stack completo de erros — apenas nome + mensagem redigidos.
 */

import { mascararEmail } from "./pii-mask.js";

export const MARCA_REDIGIDO = "[REDACTED]";

const MAX_TEXTO = 500;
const MAX_PROFUNDIDADE = 6;

const RE_BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const RE_AUTH_COOKIE = /(authorization|cookie)(["']?\s*[=:]\s*["']?)(?![Bb]earer\b)([^\s&;"']+)/gi;
const RE_PARCELA_SENSIVEL =
  /(password|passwd|senha|secret|token|api[_-]?key|apikey|client[_-]?secret|admin[_-]?token|session[_-]?secret|database[_-]?url)(["']?\s*[=:]\s*["']?)([^\s&;"']+)/gi;
const RE_URL_CREDENCIAL = /([a-z][a-z0-9+.-]*:\/\/)[^:@/\s]+:[^@/\s]+@/gi;
const RE_EMAIL = /[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/g;

/** Redige uma mensagem/string solta. Nunca lança. */
export function redigirTexto(texto: string): string {
  let s = String(texto);
  try {
    s = s.replace(RE_BEARER, "Bearer [REDACTED]");
    s = s.replace(
      RE_AUTH_COOKIE,
      (_m, nome: string, sep: string) => `${nome}${sep}${MARCA_REDIGIDO}`,
    );
    s = s.replace(
      RE_PARCELA_SENSIVEL,
      (_m, nome: string, sep: string) => `${nome}${sep}${MARCA_REDIGIDO}`,
    );
    s = s.replace(RE_URL_CREDENCIAL, `$1${MARCA_REDIGIDO}@`);
    // Nunca mascara o que já é marca ou veio de URL/estrutura (`/`, `[`) —
    // e-mail legítimo não contém esses caracteres.
    s = s.replace(RE_EMAIL, (m) =>
      m.startsWith(MARCA_REDIGIDO) || m.includes("/") || m.includes("[") ? m : mascararEmail(m),
    );
  } catch {
    return MARCA_REDIGIDO; // falha do redator nunca pode vazar o valor original
  }
  return s.length > MAX_TEXTO ? `${s.slice(0, MAX_TEXTO)}…` : s;
}

function chaveSensivel(chave: string): boolean {
  RE_PARCELA_SENSIVEL.lastIndex = 0;
  const m =
    /^(password|passwd|senha|secret|token|api[_-]?key|apikey|client[_-]?secret|admin[_-]?token|session[_-]?secret|database[_-]?url|authorization|cookie|session|stripe\w*|tmdb\w*|igdb\w*|twitch\w*|comicvine\w*)$/i.test(
      chave.replace(/[\s"']/g, ""),
    );
  const m2 = /(password|senha|secret|token|api[_-]?key|apikey|client[_-]?secret)/i.test(chave);
  return m || m2;
}

/** Cópia recursiva com chaves sensíveis redigidas e strings sanitizadas. */
export function redigirObjeto(valor: unknown, profundidade = 0, vistos?: WeakSet<object>): unknown {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor === "string") return redigirTexto(valor);
  if (typeof valor !== "object") return valor;
  if (profundidade > MAX_PROFUNDIDADE) return MARCA_REDIGIDO;
  const marca = (vistos ??= new WeakSet<object>());
  if (marca.has(valor as object)) return "[ciclo]";
  marca.add(valor as object);
  if (Array.isArray(valor)) {
    return valor.map((v) => redigirObjeto(v, profundidade + 1, marca));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    out[k] = chaveSensivel(k) ? MARCA_REDIGIDO : redigirObjeto(v, profundidade + 1, marca);
  }
  return out;
}

/** JSON de um objeto já redigido (seguro contra ciclos). Nunca lança. */
export function resumoSeguro(valor: unknown): string {
  try {
    return redigirTexto(JSON.stringify(redigirObjeto(valor)) ?? "");
  } catch {
    return "[objeto nao serializavel]";
  }
}

/** Nome + mensagem redigidos; NUNCA o stack/payload completo. */
export function redigirErro(e: unknown): string {
  const nome = e instanceof Error ? e.name : "Error";
  const msg = e instanceof Error ? e.message : String(e);
  return redigirTexto(`${nome}: ${msg}`);
}
