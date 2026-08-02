import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchTexto } from "./http.utils.js";
import { extrairNumeroPorPadrao } from "./scrape-numerico.util.js";

/**
 * Metacritic (Metascore) — sem API pública. Página de mídia expõe
 * aggregateRating em JSON-LD (0–100). Scraping numérico ISOLADO —
 * gate SCRAPE_NUMERICO_ENABLED=true.
 */
export class MetacriticAdapter implements FonteAdapter {
  readonly id = "metacritic";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie" || dominioDoTipo(tipo) === "game";
  }

  ativo(): boolean {
    return process.env.SCRAPE_NUMERICO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const slug =
      consulta.idsExternos?.metacritic ??
      consulta.titulo
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const url = `https://www.metacritic.com/${slug}`;
    const html = await fetchTexto(url);
    const score = extrairNumeroPorPadrao(
      html,
      /"aggregateRating":\s*\{\s*"ratingValue":\s*"?(\d{1,3}(?:\.\d+)?)"?/,
    );
    if (score == null) return [];
    const stats = estatisticas("0-100");
    return [
      { fonte: this.id, rating: score, media_fonte: stats.media, desvio_fonte: stats.desvio, url },
    ];
  }
}
