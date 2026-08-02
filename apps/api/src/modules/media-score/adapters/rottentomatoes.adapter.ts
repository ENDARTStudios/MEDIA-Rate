import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchTexto } from "./http.utils.js";
import { extrairNumeroPorPadrao } from "./scrape-numerico.util.js";

/**
 * Rotten Tomatoes (Tomatometer) — sem API pública. A página do filme/série
 * expõe tomatometerScore em JSON de props (0–100). Scraping numérico
 * ISOLADO — gate SCRAPE_NUMERICO_ENABLED=true.
 */
export class RottenTomatoesAdapter implements FonteAdapter {
  readonly id = "rottentomatoes";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie";
  }

  ativo(): boolean {
    return process.env.SCRAPE_NUMERICO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const slug =
      consulta.idsExternos?.rottentomatoes ??
      consulta.titulo
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    const url = `https://www.rottentomatoes.com/m/${slug}`;
    const html = await fetchTexto(url);
    const score = extrairNumeroPorPadrao(html, /"tomatometerScore":\s*(\d{1,3})/);
    if (score == null) return [];
    const stats = estatisticas("0-100");
    return [
      { fonte: this.id, rating: score, media_fonte: stats.media, desvio_fonte: stats.desvio, url },
    ];
  }
}
