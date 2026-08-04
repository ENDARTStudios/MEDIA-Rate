import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface TraktItem {
  type: "movie" | "show";
  movie?: { ids: { slug: string } } & TraktRating;
  show?: { ids: { slug: string } } & TraktRating;
}

interface TraktRating {
  rating?: number;
  votes?: number;
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
    const url = `https://api.trakt.tv/search/${tipo}?query=${encodeURIComponent(consulta.titulo)}&limit=1`;
    const itens = await fetchJson<TraktItem[]>(url, {
      headers: {
        "trakt-api-version": "2",
        "trakt-api-key": this.clientId() ?? "",
      },
    });
    const item = itens[0];
    const rating = item?.movie?.rating ?? item?.show?.rating;
    if (!rating || rating <= 0) return [];
    const slug = item?.movie?.ids.slug ?? item?.show?.ids.slug;
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: item?.movie?.votes ?? item?.show?.votes,
        url: slug ? `https://trakt.tv/${tipo}/${slug}` : undefined,
      },
    ];
  }
}
