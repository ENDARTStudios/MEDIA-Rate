import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface JikanAnime {
  data?: { score?: number; url?: string }[];
}

/** Jikan (MyAnimeList) — API não oficial pública. score 0–10 (público). */
export class JikanAdapter implements FonteAdapter {
  readonly id = "jikan";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "anime_manga";
  }

  ativo(): boolean {
    return true;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(consulta.titulo)}&limit=1&order_by=score`;
    const dados = await fetchJson<JikanAnime>(url);
    const anime = dados.data?.[0];
    if (!anime?.score) return [];
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating: anime.score,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: anime.url,
      },
    ];
  }
}
