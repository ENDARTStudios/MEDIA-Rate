import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { postJson } from "./http.utils.js";

interface OpenCriticItem {
  id: number;
  name: string;
  medianScore: number;
}

const HOST_RAPIDAPI = "opencritic-api.p.rapidapi.com";

/**
 * OpenCritic — API via RapidAPI (chave gratuita OPENCRITIC_API_KEY).
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
    const corpo = JSON.stringify({
      parameters: { platform: "", sort: "released", order: "desc" },
      criteria: { name: consulta.titulo },
    });
    const itens = await postJson<OpenCriticItem[]>(`https://${HOST_RAPIDAPI}/search`, corpo, {
      headers: {
        "content-type": "application/json",
        "x-rapidapi-key": chave,
        "x-rapidapi-host": HOST_RAPIDAPI,
      },
    });
    const item = itens.find((i) => i.medianScore > 0) ?? itens[0];
    if (!item?.medianScore) return [];
    const stats = estatisticas("0-100");
    return [
      {
        fonte: this.id,
        rating: item.medianScore,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: `https://opencritic.com/game/${item.id}/${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      },
    ];
  }
}
