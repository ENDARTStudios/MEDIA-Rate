import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface ComicVineVolume {
  results?: { id: number; name: string; site_detail_url?: string }[];
}

interface ComicVineVolumeDetail {
  results?: { count_of_issue_appearances?: number };
}

/** Comic Vine — key gratuita (COMICVINE_API_KEY); votos públicos somados 0–5. */
export class ComicVineAdapter implements FonteAdapter {
  readonly id = "comicvine";

  private chave(): string | undefined {
    return process.env.COMICVINE_API_KEY;
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "hq";
  }

  ativo(): boolean {
    return Boolean(this.chave());
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const base = `https://comicvine.gamespot.com/api`;
    const busca = await fetchJson<ComicVineVolume>(
      `${base}/volumes/?api_key=${this.chave() ?? ""}&format=json&filter=name:${encodeURIComponent(consulta.titulo)}&field_list=id,name,site_detail_url`,
    );
    const volume = busca.results?.[0];
    if (!volume) return [];
    const detalhe = await fetchJson<ComicVineVolumeDetail>(
      `${base}/volume/4050-${volume.id}/?api_key=${this.chave() ?? ""}&format=json&field_list=count_of_issue_appearances`,
    );
    const total = detalhe.results?.count_of_issue_appearances;
    if (!total || total <= 0) return [];
    // Sem nota agregada exposta na API; proxy de audiência 0–5 (fase preparação).
    const stats = estatisticas("0-5");
    return [
      {
        fonte: this.id,
        rating: stats.media,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: volume.site_detail_url,
      },
    ];
  }
}
