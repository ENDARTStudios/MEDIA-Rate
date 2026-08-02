import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchTexto } from "./http.utils.js";
import { extrairAggregateRatingJsonLd } from "./scrape-numerico.util.js";

/**
 * Amazon — sem API pública; página do produto expõe JSON-LD
 * aggregateRating.ratingValue (0–5, público). ×2. Scraping numérico
 * ISOLADO — gate MEDIA_PREPARACAO_ENABLED=true (§V).
 */
export class AmazonAdapter implements FonteAdapter {
  readonly id = "amazon";

  atendeTipo(tipo: string): boolean {
    const dominio = dominioDoTipo(tipo);
    return dominio === "livro" || dominio === "hq";
  }

  ativo(): boolean {
    return process.env.MEDIA_PREPARACAO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const asin = consulta.idsExternos?.amazon;
    if (!asin) return [];
    const url = `https://www.amazon.com/dp/${asin}`;
    const html = await fetchTexto(url, { timeoutMs: 5000 });
    const rating = extrairAggregateRatingJsonLd(html);
    if (rating == null) return [];
    const stats = estatisticas("0-5");
    return [{ fonte: this.id, rating, media_fonte: stats.media, desvio_fonte: stats.desvio, url }];
  }
}
