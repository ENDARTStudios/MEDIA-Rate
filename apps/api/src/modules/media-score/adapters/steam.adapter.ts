import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface SteamStoreSearch {
  items?: { id: number; name: string }[];
}

interface SteamReviews {
  query_summary?: { total_positive: number; total_negative: number };
}

/** Steam Store — storesearch (appid) + appreviews. Ratio positivo ×100 (público). */
export class SteamAdapter implements FonteAdapter {
  readonly id = "steam";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "game";
  }

  ativo(): boolean {
    return true;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    let appid = consulta.idsExternos?.steam_appid;
    if (!appid) {
      const busca = await fetchJson<SteamStoreSearch>(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(consulta.titulo)}&l=en&cc=us`,
      );
      const item =
        busca.items?.find((i) => i.name.toLowerCase() === consulta.titulo.toLowerCase()) ??
        busca.items?.[0];
      appid = item ? String(item.id) : undefined;
    }
    if (!appid) return [];
    const reviews = await fetchJson<SteamReviews>(
      `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all`,
    );
    const summary = reviews.query_summary;
    if (!summary || summary.total_positive + summary.total_negative === 0) return [];
    const ratio = summary.total_positive / (summary.total_positive + summary.total_negative);
    const stats = estatisticas("ratio");
    return [
      {
        fonte: this.id,
        rating: ratio,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: summary.total_positive + summary.total_negative,
        url: `https://store.steampowered.com/app/${appid}`,
      },
    ];
  }
}
