import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface SteamStoreSearch {
  items?: { id: number; name: string }[];
}

interface SteamReviews {
  query_summary?: { total_positive: number; total_negative: number };
}

/**
 * T-DADOS-41: nome para conferência de identidade — sem ™/®/©, sem acento e
 * com pontuação reduzida a espaço. O storesearch devolve produtos com nomes
 * PARECIDOS (ex.: "F1 2019" → "Sim Racing Telemetry - F1 2019"), então o
 * primeiro resultado não serve como fallback.
 */
export function normalizarNomeSteam(nome: string): string {
  return String(nome ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Steam Store — storesearch (appid) + appreviews. Ratio positivo 0–1 (público). */
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
      const alvo = normalizarNomeSteam(consulta.titulo);
      const item = alvo
        ? busca.items?.find((i) => normalizarNomeSteam(i.name) === alvo)
        : undefined;
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
