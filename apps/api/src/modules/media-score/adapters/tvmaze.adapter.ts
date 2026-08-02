import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson, type ErroColeta } from "./http.utils.js";

interface TvmazeShow {
  show: { rating: { average: number | null } };
}

/** TVMaze — sem auth, série apenas. rating.average 0–10 (audiência). */
export class TvmazeAdapter implements FonteAdapter {
  readonly id = "tvmaze";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie" && tipo === "SERIE";
  }

  ativo(): boolean {
    return true;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(consulta.titulo)}`;
    const resultados = await fetchJson<TvmazeShow[]>(url);
    const primeiro = resultados.find((r) => r.show.rating.average != null);
    if (!primeiro?.show.rating.average) return [];
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating: primeiro.show.rating.average,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(consulta.titulo)}`,
      },
    ];
  }
}

export type { ErroColeta };
