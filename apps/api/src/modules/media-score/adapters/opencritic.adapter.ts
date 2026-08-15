import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface OpenCriticSearchItem {
  id: number;
  name: string;
  /** Distância de similaridade do search — menor é melhor. */
  dist?: number;
}

interface OpenCriticDetalhe {
  name?: string;
  medianScore?: number;
  topCriticScore?: number;
  /** Quantidade de reviews de crítica contadas no medianScore. */
  numReviews?: number;
  url?: string;
}

const HOST_RAPIDAPI = "opencritic-api.p.rapidapi.com";

function compacto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function melhorCorrespondencia(
  titulo: string,
  itens: OpenCriticSearchItem[],
): OpenCriticSearchItem | undefined {
  const alvo = compacto(titulo);
  const exato = itens.find((i) => compacto(i.name) === alvo);
  if (exato) return exato;
  if (alvo.length >= 8) {
    const parciais = itens
      .filter((i) => compacto(i.name).includes(alvo))
      .sort((a, b) => compacto(a.name).length - compacto(b.name).length);
    if (parciais[0]) return parciais[0];
  }
  return itens[0];
}

/**
 * OpenCritic — API via RapidAPI (chave OPENCRITIC_API_KEY).
 * Busca GET /game/search?criteria= e detalhe GET /game/{id} para
 * medianScore 0–100 (crítica). Inativa sem chave.
 */
export class OpenCriticAdapter implements FonteAdapter {
  readonly id = "opencritic";

  private chave(): string | undefined {
    return process.env.OPENCRITIC_API_KEY;
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "game";
  }

  ativo(): boolean {
    return Boolean(this.chave());
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const chave = this.chave();
    if (!chave) return [];
    const headers = {
      "x-rapidapi-key": chave,
      "x-rapidapi-host": HOST_RAPIDAPI,
    };
    const busca = await fetchJson<OpenCriticSearchItem[]>(
      `https://${HOST_RAPIDAPI}/game/search?criteria=${encodeURIComponent(consulta.titulo)}`,
      { headers },
    );
    const item = melhorCorrespondencia(consulta.titulo, busca);
    if (!item) return [];
    const detalhe = await fetchJson<OpenCriticDetalhe>(`https://${HOST_RAPIDAPI}/game/${item.id}`, {
      headers,
    });
    const rating = detalhe.medianScore ?? detalhe.topCriticScore;
    if (!rating || rating <= 0) return [];
    const stats = estatisticas("0-100");
    const votos =
      detalhe.numReviews != null && detalhe.numReviews > 0 ? detalhe.numReviews : undefined;
    return [
      {
        fonte: this.id,
        rating,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos,
        url: detalhe.url ?? `https://opencritic.com/game/${item.id}`,
      },
    ];
  }
}
