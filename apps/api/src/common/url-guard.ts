/**
 * T191 (CodeQL js/request-forgery / SSRF) — guarda de URL externa para HTTP
 * outbound. Política (ver docs/08-security/SECURITY_CODEQL_RUNTIME.md):
 *
 * - somente HTTPS;
 * - sem userinfo na URL;
 * - IP literal direto sempre bloqueado (o parser WHATWG normaliza formas
 *   alternativas — ex.: 2130706433 → 127.0.0.1; [::1] → ::1);
 * - hostname precisa estar na allowlist explícita (exato ou subdomínio);
 * - após o DNS, TODO endereço resolvido precisa ser público (fail-closed se o
 *   DNS falhar ou voltar vazio) — mitigação básica de DNS rebinding.
 *
 * A allowlist é derivada dos hosts legítimos usados pelos adapters de
 * media-score e pelo backfill (constantes no código, sem segredos).
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ipPerigoso } from "./ip-guard.js";

export const HOSTS_EXTERNOS_PERMITIDOS: readonly string[] = [
  "api.igdb.com",
  "api.jikan.moe",
  "api.mangadex.org",
  "api.myanimelist.net",
  "api.themoviedb.org",
  "api.trakt.tv",
  "api.tvmaze.com",
  "comicbookroundup.com",
  "comicvine.gamespot.com",
  "graphql.anilist.co",
  "id.twitch.tv",
  "image.tmdb.org",
  "kitsu.io",
  "letterboxd.com",
  "mangadex.org",
  "myanimelist.net",
  "opencritic-api.p.rapidapi.com",
  "opencritic.com",
  "openlibrary.org",
  "steamspy.com",
  "store.steampowered.com",
  "trakt.tv",
  "www.amazon.com",
  "www.anime-planet.com",
  "www.goodreads.com",
  "www.googleapis.com",
  "www.igdb.com",
  "www.imdb.com",
  "www.librarything.com",
  "www.metacritic.com",
  "www.omdbapi.com",
  "www.rogerebert.com",
  "www.rottentomatoes.com",
  "www.skoob.com.br",
  "www.themoviedb.org",
];

export type MotivoUrlBloqueada =
  | "url_invalida"
  | "esquema_nao_permitido"
  | "userinfo_nao_permitido"
  | "ip_direto_bloqueado"
  | "host_nao_permitido"
  | "nome_resolvido_perigoso";

export class UrlExternaBloqueadaError extends Error {
  constructor(
    readonly motivo: MotivoUrlBloqueada,
    readonly hospedeiro?: string,
  ) {
    super(`URL externa bloqueada (motivo=${motivo}${hospedeiro ? `, host=${hospedeiro}` : ""})`);
    this.name = "UrlExternaBloqueadaError";
  }
}

export function hostPermitido(
  hostname: string,
  lista: readonly string[] = HOSTS_EXTERNOS_PERMITIDOS,
): boolean {
  const h = hostname.toLowerCase();
  return lista.some((permitido) => h === permitido || h.endsWith(`.${permitido}`));
}

/** Validação SÍNCRONA da URL (sem DNS): esquema, userinfo, IP literal, allowlist. */
export function assertUrlExternaSegura(
  urlBruto: string,
  lista: readonly string[] = HOSTS_EXTERNOS_PERMITIDOS,
): URL {
  let u: URL;
  try {
    u = new URL(urlBruto);
  } catch {
    throw new UrlExternaBloqueadaError("url_invalida");
  }
  if (u.protocol !== "https:") {
    throw new UrlExternaBloqueadaError("esquema_nao_permitido", u.hostname || undefined);
  }
  if (u.username || u.password) {
    throw new UrlExternaBloqueadaError("userinfo_nao_permitido", u.hostname);
  }
  // IPv6 no hostname vem com colchetes ([::1]); o parser WHATWG já normaliza
  // formas IPv4 alternativas (ex.: 2130706433 → 127.0.0.1) — ambos bloqueados.
  if (isIP(u.hostname.replace(/^\[|\]$/g, "")) !== 0) {
    throw new UrlExternaBloqueadaError("ip_direto_bloqueado", u.hostname);
  }
  if (!hostPermitido(u.hostname, lista)) {
    throw new UrlExternaBloqueadaError("host_nao_permitido", u.hostname);
  }
  return u;
}

export type LookupFn = (host: string) => Promise<{ address: string; family: number }[]>;

const lookupPadrao: LookupFn = (host) =>
  lookup(host, { all: true }) as Promise<{ address: string; family: number }[]>;

/**
 * Validação ASSÍNCRONA pós-DNS: todos os endereços resolvidos precisam ser
 * públicos. Fail-closed: erro de DNS ou resultado vazio bloqueia.
 */
export async function validarHostExternoResolvido(
  url: URL,
  executarLookup: LookupFn = lookupPadrao,
): Promise<void> {
  let enderecos: { address: string; family: number }[];
  try {
    enderecos = await executarLookup(url.hostname);
  } catch {
    throw new UrlExternaBloqueadaError("nome_resolvido_perigoso", url.hostname);
  }
  if (!enderecos || enderecos.length === 0) {
    throw new UrlExternaBloqueadaError("nome_resolvido_perigoso", url.hostname);
  }
  for (const endereco of enderecos) {
    if (ipPerigoso(endereco.address)) {
      throw new UrlExternaBloqueadaError("nome_resolvido_perigoso", url.hostname);
    }
  }
}
