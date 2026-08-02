import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchTexto } from "./http.utils.js";
import { extrairAggregateRatingJsonLd } from "./scrape-numerico.util.js";

/**
 * Letterboxd — sem API pública; a página do filme expõe JSON-LD com
 * aggregateRating.ratingValue (0–5). Scraping NUMÉRICO ISOLADO (Feist;
 * art. 7º Lei 9.610/98) — gate: SCRAPE_NUMERICO_ENABLED=true.
 */
export class LetterboxdAdapter implements FonteAdapter {
  readonly id = "letterboxd";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie" && tipo === "FILME";
  }

  ativo(): boolean {
    return process.env.SCRAPE_NUMERICO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const slug =
      consulta.idsExternos?.letterboxd ??
      consulta.titulo
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const url = `https://letterboxd.com/film/${slug}/`;
    const html = await fetchTexto(url);
    const rating = extrairAggregateRatingJsonLd(html);
    if (rating == null) return [];
    const stats = estatisticas("0-5");
    return [{ fonte: this.id, rating, media_fonte: stats.media, desvio_fonte: stats.desvio, url }];
  }
}
