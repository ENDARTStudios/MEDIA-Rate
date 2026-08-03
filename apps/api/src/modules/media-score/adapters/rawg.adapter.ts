import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface RawgJogo {
  name: string;
  slug: string;
  rating?: number;
}

interface RawgBusca {
  results?: RawgJogo[];
}

function compacto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** RAWG — API oficial gratuita (RAWG_API_KEY). rating 0–5 ×20 (público). */
export class RawgAdapter implements FonteAdapter {
  readonly id = "rawg";

  private chave(): string | undefined {
    return process.env.RAWG_API_KEY;
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "game";
  }

  ativo(): boolean {
    return Boolean(this.chave());
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const params = new URLSearchParams({
      key: this.chave() ?? "",
      search: consulta.titulo,
      page_size: "10",
    });
    const url = `https://api.rawg.io/api/games?${params.toString()}`;
    const dados = await fetchJson<RawgBusca>(url);
    const alvo = compacto(consulta.titulo);
    const jogo =
      dados.results?.find((j) => compacto(j.name) === alvo) ??
      dados.results?.find((j) => compacto(j.name).includes(alvo) && alvo.length >= 6) ??
      dados.results?.[0];
    if (!jogo?.rating || jogo.rating <= 0) return [];
    const stats = estatisticas("0-5");
    return [
      {
        fonte: this.id,
        rating: jogo.rating,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: `https://rawg.io/games/${jogo.slug}`,
      },
    ];
  }
}
