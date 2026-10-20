import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface TraktIds {
  slug?: string;
  tmdb?: number;
}

interface TraktRating {
  rating?: number;
  votes?: number;
}

interface TraktMidia extends TraktRating {
  title?: string;
  year?: number;
  ids?: TraktIds;
}

interface TraktItem {
  type: "movie" | "show";
  movie?: TraktMidia;
  show?: TraktMidia;
}

/** Até quantos resultados a busca traz para a conferência de identidade. */
const LIMITE_BUSCA = 8;

/**
 * T-DADOS-45: escolhe o item da busca que é A MESMA obra.
 * O `search` do Trakt casa título (inclusive traduzido) e devolve obras
 * PARECIDAS — auditoria de 60 amostras: **15%** apontavam para outra obra
 * (ex.: "Pânico 3" → "Three O'Clock High"). A identidade forte é o id do TMDB
 * (o catálogo sempre tem, para obra de fonte tmdb/tmdb_tv); sem ele, exige
 * ano ±1 (edição/estreia podem divergir em 1).
 */
export function escolherItemTrakt(
  itens: TraktItem[] | undefined,
  consulta: ConsultaMedia,
): TraktMidia | null {
  const tipo = consulta.tipo === "SERIE" ? "show" : "movie";
  const candidatos = (itens ?? [])
    .map((i) => (tipo === "show" ? i.show : i.movie))
    .filter((m): m is TraktMidia => Boolean(m));

  const idTmdb = consulta.idsExternos?.tmdb ?? consulta.idsExternos?.tmdb_tv;
  if (idTmdb && /^\d+$/.test(idTmdb)) {
    return candidatos.find((m) => String(m.ids?.tmdb ?? "") === idTmdb) ?? null;
  }

  if (consulta.ano != null) {
    const alvo = consulta.ano;
    const porAno = candidatos.find((m) => m.year != null && Math.abs(Number(m.year) - alvo) <= 1);
    if (porAno) return porAno;
  }
  return null;
}

/** Trakt.tv — API key gratuita (TRAKT_CLIENT_ID). rating 0–10 (audiência). */
export class TraktAdapter implements FonteAdapter {
  readonly id = "trakt";

  private clientId(): string | undefined {
    return process.env.TRAKT_CLIENT_ID;
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie";
  }

  ativo(): boolean {
    return Boolean(this.clientId());
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const tipo = consulta.tipo === "SERIE" ? "show" : "movie";
    const params = new URLSearchParams({
      query: consulta.titulo,
      limit: String(LIMITE_BUSCA),
    });
    // `years` filtra no servidor; a conferência local abaixo é que decide.
    if (consulta.ano) params.set("years", String(consulta.ano));
    const url = `https://api.trakt.tv/search/${tipo}?${params.toString()}`;
    const itens = await fetchJson<TraktItem[]>(url, {
      headers: {
        "trakt-api-version": "2",
        "trakt-api-key": this.clientId() ?? "",
      },
    });
    const item = escolherItemTrakt(itens, consulta);
    if (!item) return [];
    const rating = item.rating;
    if (!rating || rating <= 0) return [];
    const slug = item.ids?.slug;
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: item.votes,
        url: slug ? `https://trakt.tv/${tipo}/${slug}` : undefined,
      },
    ];
  }
}
