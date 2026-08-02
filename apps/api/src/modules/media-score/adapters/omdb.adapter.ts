import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface OmdbResponse {
  imdbRating?: string;
  imdbID?: string;
  Response?: string;
}

/** OMDb (dados IMDb) — key gratuita (OMDB_API_KEY), 1k req/dia. imdbRating 0–10. */
export class OmdbAdapter implements FonteAdapter {
  readonly id = "omdb";

  private chave(): string | undefined {
    return process.env.OMDB_API_KEY;
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie";
  }

  ativo(): boolean {
    return Boolean(this.chave());
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const params = new URLSearchParams({ apikey: this.chave() ?? "", t: consulta.titulo });
    if (consulta.ano) params.set("y", String(consulta.ano));
    const url = `https://www.omdbapi.com/?${params.toString()}`;
    const dados = await fetchJson<OmdbResponse>(url);
    if (dados.Response === "False" || !dados.imdbRating) return [];
    const rating = Number.parseFloat(dados.imdbRating);
    if (!Number.isFinite(rating)) return [];
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: `https://www.imdb.com/title/${dados.imdbID}`,
      },
    ];
  }
}
