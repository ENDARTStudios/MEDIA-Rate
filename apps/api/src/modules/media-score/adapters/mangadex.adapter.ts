import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface MangaDexStats {
  rating?: { average?: number; bayesian?: number; distribution?: Record<string, number> };
}

interface MangaDexSearch {
  data?: { id?: string; attributes?: { title?: Record<string, string> } }[];
}

/** MangaDex — API pública; rating.average 0–10 (público). */
export class MangaDexAdapter implements FonteAdapter {
  readonly id = "mangadex";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "anime_manga";
  }

  ativo(): boolean {
    return true;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const busca = await fetchJson<MangaDexSearch>(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(consulta.titulo)}&limit=1`,
    );
    const manga = busca.data?.[0];
    if (!manga?.id) return [];
    const statsDados = await fetchJson<MangaDexStats>(
      `https://api.mangadex.org/statistics/manga/${manga.id}`,
    );
    const nota = statsDados.rating?.bayesian ?? statsDados.rating?.average;
    if (!nota) return [];
    const distribuicao = statsDados.rating?.distribution;
    const votos = distribuicao
      ? Object.values(distribuicao).reduce((acc, v) => acc + (Number(v) || 0), 0)
      : undefined;
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating: nota,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: votos && votos > 0 ? votos : undefined,
        url: `https://mangadex.org/title/${manga.id}`,
      },
    ];
  }
}
