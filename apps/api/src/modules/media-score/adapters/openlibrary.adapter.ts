import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface OpenLibraryResult {
  docs: { ratings_average?: number; ratings_count?: number }[];
}

/** Open Library — API aberta; ratings_average 0–5 (público). ×2. */
export class OpenLibraryAdapter implements FonteAdapter {
  readonly id = "openlibrary";

  private readonly fasePreparacao = process.env.MEDIA_PREPARACAO_ENABLED === "true";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "livro";
  }

  ativo(): boolean {
    return this.fasePreparacao;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(consulta.titulo)}&fields=key,ratings_average,ratings_count&limit=1`;
    const dados = await fetchJson<OpenLibraryResult>(url);
    const doc = dados.docs[0];
    if (!doc?.ratings_average || doc.ratings_average <= 0) return [];
    const stats = estatisticas("0-5");
    return [
      {
        fonte: this.id,
        rating: doc.ratings_average,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: doc.ratings_count,
        url: `https://openlibrary.org/search?q=${encodeURIComponent(consulta.titulo)}`,
      },
    ];
  }
}
