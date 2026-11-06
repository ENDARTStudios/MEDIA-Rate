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
 * T-DADOS-79: id EXATO do MAL quando o catálogo já o conhece.
 * O `fonte_id` dos mangás veio do Jikan, que é um proxy da API oficial e
 * devolve o **mesmo** id — sonda em produção: `/v2/manga/{fonte_id}` em 12
 * títulos devolveu 12/12 com o título idêntico ao do catálogo. Com o id a
 * coleta é 1 requisição e sem risco de identidade; sem ele, a busca pelo
 * título japonês/traduzido devolve nada e o título fica sem nota.
 */
function idMalExato(consulta: ConsultaMedia): string | null {
  const bruto = consulta.idsExternos?.mal ?? consulta.idsExternos?.jikan;
  const id = String(bruto ?? "").trim();
  return /^\d+$/.test(id) ? id : null;
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
    const idExato = idMalExato(consulta);
    if (idExato) {
      let node: MalSearchNode;
      try {
        node = await fetchJson<MalSearchNode>(
          `https://api.myanimelist.net/v2/${segmento}/${idExato}?fields=id,title,mean,num_scoring_users`,
          { headers: { "X-Mal-Client-ID": this.chave() ?? "" } },
        );
      } catch (erro) {
        // Id que não existe (mais) na fonte é lacuna honesta, não falha
        // transitória: devolver "erro" prenderia o título vencido para sempre.
        if ((erro as { status?: number } | null)?.status === 404) return [];
        throw erro;
      }
      return this.notaDe(node, segmento);
    }

    const url = `https://api.myanimelist.net/v2/${segmento}?q=${encodeURIComponent(consulta.titulo)}&limit=1&fields=id,title,mean,num_scoring_users`;
    const dados = await fetchJson<MalSearchResponse>(url, {
      headers: { "X-Mal-Client-ID": this.chave() ?? "" },
    });
    return this.notaDe(dados.data?.[0]?.node, segmento);
  }

  private notaDe(node: MalSearchNode | undefined, segmento: string): NotaColetada[] {
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
