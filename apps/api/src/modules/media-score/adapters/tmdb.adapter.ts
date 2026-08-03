import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface TmdbResultado {
  id: number;
  title?: string;
  name?: string;
  vote_average?: number;
  vote_count?: number;
}

interface TmdbBusca {
  results?: TmdbResultado[];
}

/** TMDB — API oficial gratuita (TMDB_API_KEY). vote_average 0–10 (público). */
export class TmdbAdapter implements FonteAdapter {
  readonly id = "tmdb";

  private chave(): string | undefined {
    return process.env.TMDB_API_KEY;
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie";
  }

  ativo(): boolean {
    return Boolean(this.chave());
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const params = new URLSearchParams({
      api_key: this.chave() ?? "",
      query: consulta.titulo,
      language: "pt-BR",
    });
    if (consulta.ano) params.set("year", String(consulta.ano));
    const tipo = consulta.tipo === "SERIE" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/search/${tipo}?${params.toString()}`;
    const dados = await fetchJson<TmdbBusca>(url);
    const item = dados.results?.[0];
    if (!item?.vote_average) return [];
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating: item.vote_average,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: item.vote_count,
        url: `https://www.themoviedb.org/${tipo}/${item.id}`,
      },
    ];
  }
}
