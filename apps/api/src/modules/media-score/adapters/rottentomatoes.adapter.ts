import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchTexto, UA_BROWSER } from "./http.utils.js";
import { extrairNumeroPorPadrao } from "./scrape-numerico.util.js";

/**
 * Rotten Tomatoes (Tomatometer) — sem API pública. A página do filme/série
 * expõe tomatometerScore em JSON de props (0–100). Scraping numérico
 * ISOLADO — gate SCRAPE_NUMERICO_ENABLED=true.
 */
/** T176: URL por tipo (/m/ filme, /tv/ série) com slug underscore. */
export function urlRottenTomatoes(consulta: ConsultaMedia): string {
  const slug =
    consulta.idsExternos?.rottentomatoes ??
    consulta.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  const segmento = consulta.tipo === "SERIE" ? "tv" : "m";
  return `https://www.rottentomatoes.com/${segmento}/${slug}`;
}

export class RottenTomatoesAdapter implements FonteAdapter {
  readonly id = "rottentomatoes";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie";
  }

  ativo(): boolean {
    return process.env.SCRAPE_NUMERICO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const url = urlRottenTomatoes(consulta);
    const html = await fetchTexto(url, {
      // T176: UA de browser + ratingValue do JSON-LD (o padrão antigo
      // tomatometerScore não está mais na página).
      headers: { "User-Agent": UA_BROWSER, Accept: "text/html" },
    });
    const score =
      extrairNumeroPorPadrao(html, /"ratingValue":\s*"?([0-9]{1,3})"?/) ??
      extrairNumeroPorPadrao(html, /"tomatometerScore":\s*(\d{1,3})/);
    if (score == null) return [];
    const stats = estatisticas("0-100");
    return [
      { fonte: this.id, rating: score, media_fonte: stats.media, desvio_fonte: stats.desvio, url },
    ];
  }
}
