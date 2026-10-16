import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { postJson } from "./http.utils.js";

interface TokenTwitch {
  access_token?: string;
  expires_in?: number;
}

interface JogoIgdb {
  name?: string;
  slug?: string;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  rating?: number;
  rating_count?: number;
}

let tokenCache: { token: string; expiraEm: number } | null = null;

/** Remove aspas (quebram a query Apicalypse `search "..."`) e colapsa espaços. */
export function sanitizarTitulo(titulo: string): string {
  return titulo.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
}

/** Normaliza título para validação de identidade (caixa, acentos, pontuação). */
export function normalizarTitulo(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Id do IGDB utilizável (string de dígitos)? */
function idIgdbUtilizavel(id: string | undefined): id is string {
  return typeof id === "string" && /^\d+$/.test(id.trim());
}

async function obterTokenTwitch(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiraEm) return tokenCache.token;
  const corpo = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID ?? "",
    client_secret: process.env.TWITCH_CLIENT_SECRET ?? "",
    grant_type: "client_credentials",
  }).toString();
  const resposta = await postJson<TokenTwitch>("https://id.twitch.tv/oauth2/token", corpo, {
    headers: {
      "accept": "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
  });
  if (!resposta.access_token) return "";
  tokenCache = {
    token: resposta.access_token,
    expiraEm: Date.now() + ((resposta.expires_in ?? 3600) - 60) * 1000,
  };
  return resposta.access_token;
}

/**
 * IGDB — API oficial com OAuth Twitch (TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET).
 * aggregated_rating 0–100 (crítica) e rating 0–100 (público).
 * Instancia duas vezes: fonte "igdb" (crítica) e "igdb_publico" (público).
 */
export class IgdbAdapter implements FonteAdapter {
  readonly id: string;

  constructor(fonte: "igdb" | "igdb_publico" = "igdb") {
    this.id = fonte;
  }

  private credenciais(): boolean {
    return Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "game";
  }

  ativo(): boolean {
    return this.credenciais();
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    if (!this.credenciais()) return [];
    const token = await obterTokenTwitch();
    if (!token) return [];
    const campo = this.id === "igdb_publico" ? "rating" : "aggregated_rating";
    const campoVotos = this.id === "igdb_publico" ? "rating_count" : "aggregated_rating_count";
    // T-DADOS-05: o job popula `idsExternos.igdb` com o id exato do IGDB
    // (gravado por id no T-DADOS-03). Preferir o id ao `search` textual, que
    // devolvia DLC/ports/entidades homônimas e sobrescrevia a nota correta.
    const idIgdb = consulta.idsExternos?.igdb;
    const porId = idIgdbUtilizavel(idIgdb);
    const corpo = porId
      ? `fields name, slug, ${campo}, ${campoVotos}; where id = ${idIgdb.trim()}; limit 1;`
      : `search "${sanitizarTitulo(consulta.titulo)}"; fields name, slug, ${campo}, ${campoVotos}; where ${campo} != null; limit 1;`;
    const jogos = await postJson<JogoIgdb[]>("https://api.igdb.com/v4/games", corpo, {
      headers: {
        "client-id": process.env.TWITCH_CLIENT_ID ?? "",
        "authorization": `Bearer ${token}`,
        "accept": "application/json",
        "content-type": "text/plain",
      },
    });
    const jogo = jogos[0];
    // Fallback textual: só aceita se o `name` retornado for a mesma obra
    // (normalizado) — senão o `search` pode trazer DLC/porta/homônimo.
    if (!porId && normalizarTitulo(jogo?.name ?? "") !== normalizarTitulo(consulta.titulo)) {
      return [];
    }
    const nota = jogo?.[campo];
    if (!nota || nota <= 0) return [];
    const stats = estatisticas("0-100");
    return [
      {
        fonte: this.id,
        rating: nota,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: jogo?.[campoVotos],
        url: jogo.slug ? `https://www.igdb.com/games/${jogo.slug}` : undefined,
      },
    ];
  }
}
