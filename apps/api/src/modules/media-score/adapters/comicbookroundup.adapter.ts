import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface ComicBookRoundupIssue {
  id: number;
  name: string;
  score?: number;
  userScore?: number;
}

/** ComicBookRoundup — API não oficial (issues/). score % 0–100 (crítica); ÷10. */
export class ComicBookRoundupAdapter implements FonteAdapter {
  readonly id = "comicbookroundup";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "hq";
  }

  ativo(): boolean {
    // Endpoint /api/issues/search não existe — medido 2026-10-18 (HTTP 404).
    // Desligado até haver uma fonte real (o site é HTML; sem API pública).
    return false;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const url = `https://comicbookroundup.com/api/issues/search?q=${encodeURIComponent(consulta.titulo)}`;
    const dados = await fetchJson<{ data?: ComicBookRoundupIssue[] }>(url);
    const issue = dados.data?.find((i) => i.score != null && i.score > 0);
    if (!issue?.score) return [];
    const stats = estatisticas("0-100");
    return [
      {
        fonte: this.id,
        rating: issue.score,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: `https://comicbookroundup.com/comic-book-reviews/${issue.name}`,
      },
    ];
  }
}
