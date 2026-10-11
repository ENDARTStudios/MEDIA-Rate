/**
 * Utilitários HTTP para adaptadores de fontes.
 * Usa fetch nativo (Node 20+), com timeout e UA identificável.
 *
 * T191 (CodeQL js/request-forgery / SSRF): todo outbound passa pelo url-guard —
 * allowlist explícita de hosts, somente HTTPS, sem userinfo/IP literal,
 * validação do IP resolvido (anti-rebinding), redirects manuais validados hop a
 * hop e limite de saltos — e as mensagens de erro são sanitizadas: a URL
 * completa (com query, que pode conter chave de API) nunca aparece em erro/log.
 */

import { assertUrlExternaSegura, validarHostExternoResolvido } from "../../../common/url-guard.js";

export { HOSTS_EXTERNOS_PERMITIDOS } from "../../../common/url-guard.js";
export { UrlExternaBloqueadaError } from "../../../common/url-guard.js";

const USER_AGENT = "MEDIA-Rate/0.1 (coleta de notas numericas; contato: media-rate)";

/** T176: UA de browser para os scrapers — Cloudflare bloqueia UA de bot. */
export const UA_BROWSER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export interface HttpOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

const TEMPO_PADRAO_MS = 8000;
const MAX_REDIRECIONAMENTOS = 3;
const STATUS_REDIRECIONAMENTO = new Set([301, 302, 303, 307, 308]);

export class ErroColeta extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ErroColeta";
  }
}

/** Forma segura para erro/log: origem + path, SEM query/hash. */
function urlSegura(url: string | URL): string {
  try {
    const u = typeof url === "string" ? new URL(url) : url;
    return `${u.origin}${u.pathname}`;
  } catch {
    return "[url invalida]";
  }
}

/** Valida (URL + DNS) e devolve o alvo normalizado. */
async function validarAlvo(urlBruto: string): Promise<URL> {
  const alvo = assertUrlExternaSegura(urlBruto);
  await validarHostExternoResolvido(alvo);
  return alvo;
}

async function requisicao(url: string, opcoes: HttpOptions): Promise<Response> {
  const metodo = opcoes.method ?? "GET";
  let alvo = await validarAlvo(url);
  for (let saltos = 0; ; saltos += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opcoes.timeoutMs ?? TEMPO_PADRAO_MS);
    try {
      const resposta = await fetch(alvo, {
        method: metodo,
        headers: {
          "user-agent": USER_AGENT,
          ...opcoes.headers,
        },
        body: opcoes.body,
        signal: controller.signal,
        redirect: "manual",
      });
      if (STATUS_REDIRECIONAMENTO.has(resposta.status)) {
        if (metodo !== "GET") {
          throw new ErroColeta(
            `HTTP ${resposta.status} (redirect nao seguido) em ${urlSegura(alvo)}`,
            resposta.status,
          );
        }
        if (saltos >= MAX_REDIRECIONAMENTOS) {
          throw new ErroColeta(
            `redirecionamentos excedidos em ${urlSegura(alvo)}`,
            resposta.status,
          );
        }
        const location = resposta.headers.get("location");
        if (!location) {
          throw new ErroColeta(
            `HTTP ${resposta.status} sem location em ${urlSegura(alvo)}`,
            resposta.status,
          );
        }
        let proximo: string;
        try {
          proximo = new URL(location, alvo).toString();
        } catch {
          throw new ErroColeta(`redirect invalido a partir de ${urlSegura(alvo)}`, resposta.status);
        }
        alvo = await validarAlvo(proximo);
        continue;
      }
      if (!resposta.ok) {
        throw new ErroColeta(`HTTP ${resposta.status} em ${urlSegura(alvo)}`, resposta.status);
      }
      return resposta;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** GET → JSON tipado (lança ErroColeta em não-2xx/parse). */
export async function fetchJson<T>(url: string, opcoes: HttpOptions = {}): Promise<T> {
  const resposta = await requisicao(url, opcoes);
  try {
    return (await resposta.json()) as T;
  } catch (err) {
    throw new ErroColeta(`JSON inválido em ${urlSegura(url)}: ${String(err)}`);
  }
}

/** GET → texto (para scrape numérico). */
export async function fetchTexto(url: string, opcoes: HttpOptions = {}): Promise<string> {
  const resposta = await requisicao(url, opcoes);
  return resposta.text();
}

/** POST → JSON tipado (GraphQL etc.). */
export async function postJson<T>(url: string, body: string, opcoes: HttpOptions = {}): Promise<T> {
  const resposta = await requisicao(url, { ...opcoes, method: "POST", body });
  try {
    return (await resposta.json()) as T;
  } catch (err) {
    throw new ErroColeta(`JSON inválido em ${urlSegura(url)}: ${String(err)}`);
  }
}
