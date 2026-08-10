/**
 * igdb-http.ts (T276/D-265) — cliente HTTP compartilhado do IGDB v4
 * (OAuth Twitch client-credentials + POST APGQL), reutilizado por
 * seed-games, seed-posters e scripts/audit-igdb-ids.ts.
 *
 * STANDALONE: sem imports de src/ (roda no container de produção).
 * - Nenhum segredo em logs (D-257).
 * - Rate limit: delay ≥ 300ms entre chamadas + 1 retry (nunca aborta).
 */

const IGDB_URL = "https://api.igdb.com/v4/games";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const DELAY_MS = 300;
const RETRY_MAX = 1;

interface TokenTwitch {
  access_token?: string;
  expires_in?: number;
}

let tokenTwitch: { token: string; expiraEm: number } | null = null;

/** Limpa o cache de token (usado em testes). */
export function resetTokenTwitch(): void {
  tokenTwitch = null;
}

export interface IgdbJogoBasico {
  id?: number;
  name?: string;
  slug?: string;
}

export function logHttpErro(fonte: string, url: string, res: Response): void {
  const status = res.status;
  const trecho = res.statusText ?? "";
  console.warn(`[igdb] ${fonte} erro HTTP ${status}: ${trecho.slice(0, 200)}`);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST body APGQL (IGDB v4) → JSON. O IGDB v4 exige POST com a query no body. */
export async function postApigql<T>(
  url: string,
  query: string,
  headers: Record<string, string>,
  retry = 0,
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain", ...headers },
      body: query,
    });
    if (!res.ok) {
      logHttpErro("igdb", url, res);
      if (retry < RETRY_MAX) {
        await delay(DELAY_MS);
        return postApigql<T>(url, query, headers, retry + 1);
      }
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[igdb] falhou: ${url.slice(0, 80)} (${String(err).slice(0, 120)})`);
    if (retry < RETRY_MAX) {
      await delay(DELAY_MS);
      return postApigql<T>(url, query, headers, retry + 1);
    }
    return null;
  }
}

/** POST form-urlencoded (OAuth do Twitch exige POST — GET retorna null). */
export async function postForm<T>(
  url: string,
  corpo: URLSearchParams,
  retry = 0,
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: corpo.toString(),
    });
    if (!res.ok) {
      logHttpErro("oauth", url, res);
      if (retry < RETRY_MAX) {
        await delay(DELAY_MS);
        return postForm<T>(url, corpo, retry + 1);
      }
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[igdb] OAuth falhou: ${url.slice(0, 80)} (${String(err).slice(0, 120)})`);
    if (retry < RETRY_MAX) {
      await delay(DELAY_MS);
      return postForm<T>(url, corpo, retry + 1);
    }
    return null;
  }
}

/** Token OAuth Twitch (client-credentials), cacheado até próximo da expiração. */
export async function obterTokenTwitch(): Promise<string | null> {
  if (tokenTwitch && Date.now() < tokenTwitch.expiraEm) return tokenTwitch.token;
  const clientId = process.env.TWITCH_CLIENT_ID ?? "";
  const secret = process.env.TWITCH_CLIENT_SECRET ?? "";
  if (!clientId || !secret) return null;
  const corpo = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    grant_type: "client_credentials",
  });
  const dados = await postForm<TokenTwitch>(TWITCH_TOKEN_URL, corpo);
  if (!dados?.access_token) return null;
  tokenTwitch = {
    token: dados.access_token,
    expiraEm: Date.now() + ((dados.expires_in ?? 3600) - 60) * 1000,
  };
  return dados.access_token;
}

async function headersAutenticados(): Promise<Record<string, string> | null> {
  const token = await obterTokenTwitch();
  if (!token) return null;
  return {
    "client-id": process.env.TWITCH_CLIENT_ID ?? "",
    "authorization": `Bearer ${token}`,
  };
}

/** Consulta APGQL em /v4/games (null em falha — nunca lança). */
export async function consultarGames(query: string): Promise<IgdbJogoBasico[] | null> {
  const headers = await headersAutenticados();
  if (!headers) return null;
  return postApigql<IgdbJogoBasico[]>(IGDB_URL, query, headers);
}

/** Id exato por slug: 'fields id,name,slug; where slug = "X"; limit 1;'. */
export async function buscarIdPorSlug(slug: string): Promise<{ id: number; slug: string } | null> {
  const jogos = await consultarGames(`fields id,name,slug; where slug = "${slug}"; limit 1;`);
  const j = jogos?.[0];
  return j?.id ? { id: j.id, slug: j.slug ?? slug } : null;
}

/** Candidatos por nome: 'search "X"; fields id,name,slug; limit 5;'. */
export async function buscarCandidatosPorNome(nome: string): Promise<IgdbJogoBasico[]> {
  const nomeLimpo = nome.replace(/[":\\]/g, " ");
  return (await consultarGames(`search "${nomeLimpo}"; fields id,name,slug; limit 5;`)) ?? [];
}

/** Normaliza título para casamento (sem acentos/caixa/pontuação). */
export function normalizarTitulo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Melhor candidato por sobreposição de tokens do nome normalizado.
 * Exige ≥ 50% de sobreposição — sem falso positivo com nomes genéricos.
 */
export function melhorCandidato(nome: string, candidatos: IgdbJogoBasico[]): IgdbJogoBasico | null {
  const alvo = normalizarTitulo(nome);
  if (!alvo) return null;
  const tokens = new Set(alvo.split(" "));
  let melhor: IgdbJogoBasico | null = null;
  let melhorScore = 0;
  for (const c of candidatos) {
    const nomeC = normalizarTitulo(c.name ?? "");
    if (!nomeC) continue;
    const tokensC = new Set(nomeC.split(" "));
    let acertos = 0;
    for (const t of tokensC) if (t && tokens.has(t)) acertos++;
    const score = acertos / Math.max(tokens.size, 1);
    if (score > melhorScore) {
      melhor = c;
      melhorScore = score;
    }
  }
  return melhorScore >= 0.5 ? melhor : null;
}

/**
 * Casamento ESTRITO por tokens normalizados (conjuntos idênticos) — usado
 * para AUTO-CORREÇÃO segura via lookup por nome: sem falso positivo com
 * nomes próximos ("Elden Ring" ≠ "Ring Fit Adventure").
 */
export function nomeConfere(nome: string, candidato: IgdbJogoBasico | null | undefined): boolean {
  if (!candidato?.name) return false;
  const a = normalizarTitulo(nome);
  const b = normalizarTitulo(candidato.name);
  if (!a || !b || a !== b) return false;
  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  if (ta.size !== tb.size) return false;
  for (const t of ta) if (!tb.has(t)) return false;
  return true;
}
