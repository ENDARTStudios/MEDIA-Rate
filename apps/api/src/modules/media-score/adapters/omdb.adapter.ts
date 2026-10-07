import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface OmdbResponse {
  imdbRating?: string;
  imdbID?: string;
  imdbVotes?: string;
  Response?: string;
  Ratings?: { Source: string; Value: string }[];
}

/**
 * T175: extrai as notas de CRÍTICA do array Ratings do OMDb (Rotten
 * Tomatoes "85%" e Metacritic "77/100") — sem scraping, mesma resposta da
 * API. Escalas conforme o source-registry (0-100, fator100: 1).
 */
export function mapearRatingsOmdb(
  ratings: { Source: string; Value: string }[] | undefined,
  url: string,
): NotaColetada[] {
  const criticas: NotaColetada[] = [];
  const stats = estatisticas("0-100");
  for (const r of ratings ?? []) {
    const primeiro = (r.Value ?? "").split("/")[0] ?? "";
    const bruto = Number.parseInt(primeiro.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(bruto) || bruto <= 0) continue;
    if (/rotten tomatoes/i.test(r.Source)) {
      criticas.push({
        fonte: "rottentomatoes",
        rating: Math.min(100, bruto),
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url,
      });
    } else if (/metacritic/i.test(r.Source)) {
      criticas.push({
        fonte: "metacritic",
        rating: Math.min(100, bruto),
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url,
      });
    }
  }
  return criticas;
}

/** OMDb (dados IMDb) — key gratuita (OMDB_API_KEY), 1k req/dia. imdbRating 0–10. */
export class OmdbAdapter implements FonteAdapter {
  readonly id = "omdb";

  private chave(): string | undefined {
    return process.env.OMDB_API_KEY;
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie";
  }

  ativo(): boolean {
    return Boolean(this.chave());
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const params = new URLSearchParams({ apikey: this.chave() ?? "", t: consulta.titulo });
    if (consulta.ano) params.set("y", String(consulta.ano));
    const url = `https://www.omdbapi.com/?${params.toString()}`;
    const dados = await fetchJson<OmdbResponse>(url);
    if (dados.Response === "False" || !dados.imdbRating) return [];
    const rating = Number.parseFloat(dados.imdbRating);
    if (!Number.isFinite(rating)) return [];
    const votosBrutos = Number(dados.imdbVotes?.replace(/,/g, "") ?? "");
    const stats = estatisticas("0-10");
    const urlImdb = `https://www.imdb.com/title/${dados.imdbID}`;
    return [
      {
        fonte: this.id,
        rating,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: Number.isFinite(votosBrutos) && votosBrutos > 0 ? votosBrutos : undefined,
        url: urlImdb,
      },
      // T175: crítica real (RT/Metacritic) da MESMA resposta — sem scraping.
      ...mapearRatingsOmdb(dados.Ratings, urlImdb),
    ];
  }
}
