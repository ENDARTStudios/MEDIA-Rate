import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface SteamSpyApp {
  appid: number;
  name: string;
  positive: number;
  negative: number;
}

/**
 * Steam Spy — dados da Store via terceiros; ratio positivo ×100 (público).
 * A API pública steamspy.com foi descontinuada (retorna vazio desde 2025);
 * o acesso atual exige chave paga (STEAMSPY_API_KEY). Inativa sem chave.
 */
export class SteamSpyAdapter implements FonteAdapter {
  readonly id = "steamspy";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "game";
  }

  ativo(): boolean {
    return Boolean(process.env.STEAMSPY_API_KEY);
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const url = `https://steamspy.com/api.php?request=search&q=${encodeURIComponent(consulta.titulo)}`;
    const apps = await fetchJson<SteamSpyApp[]>(url);
    const app = apps.find((a) => a.name.toLowerCase() === consulta.titulo.toLowerCase()) ?? apps[0];
    if (!app || app.positive + app.negative === 0) return [];
    const ratio = app.positive / (app.positive + app.negative);
    const stats = estatisticas("ratio");
    return [
      {
        fonte: this.id,
        rating: ratio,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: `https://store.steampowered.com/app/${app.appid}`,
      },
    ];
  }
}
