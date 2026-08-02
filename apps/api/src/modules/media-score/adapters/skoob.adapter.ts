import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchTexto } from "./http.utils.js";
import { extrairAggregateRatingJsonLd } from "./scrape-numerico.util.js";

/**
 * Skoob — sem API pública; página do livro expõe JSON-LD
 * aggregateRating.ratingValue (0–5, público). Scraping numérico ISOLADO —
 * gate MEDIA_PREPARACAO_ENABLED=true (§IV).
 */
export class SkoobAdapter implements FonteAdapter {
  readonly id = "skoob";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "livro";
  }

  ativo(): boolean {
    return process.env.MEDIA_PREPARACAO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const slug =
      consulta.idsExternos?.skoob ??
      consulta.titulo
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const url = `https://www.skoob.com.br/livro/${slug}`;
    const html = await fetchTexto(url);
    const rating = extrairAggregateRatingJsonLd(html);
    if (rating == null) return [];
    const stats = estatisticas("0-5");
    return [{ fonte: this.id, rating, media_fonte: stats.media, desvio_fonte: stats.desvio, url }];
  }
}
