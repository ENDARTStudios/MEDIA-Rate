/**
 * Utilitários HTTP para adaptadores de fontes.
 * Usa fetch nativo (Node 20+), com timeout e UA identificável.
 */

const USER_AGENT = "MEDIA-Rate/0.1 (coleta de notas numericas; contato: media-rate)";

export interface HttpOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

const TEMPO_PADRAO_MS = 8000;

export class ErroColeta extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ErroColeta";
  }
}

async function requisicao(url: string, opcoes: HttpOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opcoes.timeoutMs ?? TEMPO_PADRAO_MS);
  try {
    const resposta = await fetch(url, {
      method: opcoes.method ?? "GET",
      headers: {
        "user-agent": USER_AGENT,
        ...opcoes.headers,
      },
      body: opcoes.body,
      signal: controller.signal,
    });
    if (!resposta.ok) {
      throw new ErroColeta(`HTTP ${resposta.status} em ${url}`, resposta.status);
    }
    return resposta;
  } finally {
    clearTimeout(timer);
  }
}

/** GET → JSON tipado (lança ErroColeta em não-2xx/parse). */
export async function fetchJson<T>(url: string, opcoes: HttpOptions = {}): Promise<T> {
  const resposta = await requisicao(url, opcoes);
  try {
    return (await resposta.json()) as T;
  } catch (err) {
    throw new ErroColeta(`JSON inválido em ${url}: ${String(err)}`);
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
    throw new ErroColeta(`JSON inválido em ${url}: ${String(err)}`);
  }
}
