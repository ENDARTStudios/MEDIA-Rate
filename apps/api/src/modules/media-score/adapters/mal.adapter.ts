import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface MalSearchNode {
  id?: number;
  title?: string;
  mean?: number;
  num_scoring_users?: number;
}

interface MalSearchResponse {
  data?: { node?: MalSearchNode }[];
}

/**
 * MyAnimeList (API oficial v2) — busca pública sem OAuth: o header
 * `X-Mal-Client-ID` com o client_id da aplicação (MAL_CLIENT_ID) já dá
 * acesso aos endpoints públicos /v2/manga e /v2/anime. score 0–10 (público).
 *
 * Não depende do Jikan (proxy público, instável) — usa a API oficial
 * diretamente, consultando /manga para mangás e /anime para animações.
 */
export class MalAdapter implements FonteAdapter {
  readonly id = "mal";

  private chave(): string | undefined {
    return process.env.MAL_CLIENT_ID;
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "anime_manga";
  }

  ativo(): boolean {
    return Boolean(this.chave());
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const segmento = consulta.tipo === "MANGA" ? "manga" : "anime";
    const url = `https://api.myanimelist.net/v2/${segmento}?q=${encodeURIComponent(consulta.titulo)}&limit=1&fields=id,title,mean,num_scoring_users`;
    const dados = await fetchJson<MalSearchResponse>(url, {
      headers: { "X-Mal-Client-ID": this.chave() ?? "" },
    });
    const node = dados.data?.[0]?.node;
    const nota = node?.mean;
    if (!nota) return [];
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating: nota,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: node?.num_scoring_users ?? undefined,
        url: node?.id ? `https://myanimelist.net/${segmento}/${node.id}` : undefined,
      },
    ];
  }
}
