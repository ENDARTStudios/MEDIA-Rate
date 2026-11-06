import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface JikanAnime {
  data?: { score?: number; url?: string; scored_by?: number }[];
}

/** Jikan (MyAnimeList) — API não oficial pública. score 0–10 (público). */
export class JikanAdapter implements FonteAdapter {
  readonly id = "jikan";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "anime_manga";
  }

  /**
   * T-DADOS-79: fonte APOSENTADA. O host `api.jikan.moe` está bloqueado no
   * egress de produção (`fetch failed` em 100% das chamadas, medido no log do
   * passe); além disso é um proxy não oficial do **mesmo** dado que o
   * `MalAdapter` já coleta na API oficial (e o `fonte_id` dos mangás é o id
   * do MAL). Manter ativa custava um timeout por título e, pior, marcava
   * `status: "erro"` em todo mangá — o passe então nunca marcava o título como
   * coletado e girava indefinidamente (11.331 mangás, 1,5 mil títulos/h sem
   * nenhum avanço). Ligável por env se um dia o host voltar.
   */
  ativo(): boolean {
    return process.env.MEDIA_JIKAN_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    // D-233: MANGA usa o endpoint /manga; ANIME/SERIE usa /anime.
    const segmento = consulta.tipo === "MANGA" ? "manga" : "anime";
    const url = `https://api.jikan.moe/v4/${segmento}?q=${encodeURIComponent(consulta.titulo)}&limit=1&order_by=score`;
    const dados = await fetchJson<JikanAnime>(url);
    const anime = dados.data?.[0];
    if (!anime?.score) return [];
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating: anime.score,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: anime.scored_by,
        url: anime.url,
      },
    ];
  }
}
