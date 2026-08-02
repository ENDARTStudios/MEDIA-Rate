import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface LibraryThingWork {
  id: number;
  title?: string;
  rating?: { num_ratings?: number };
}

/** LibraryThing — API JSON pública (api.librarything.com). Nota 0–10? Usa 0–5 (público). */
export class LibraryThingAdapter implements FonteAdapter {
  readonly id = "librarything";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "livro";
  }

  ativo(): boolean {
    return process.env.MEDIA_PREPARACAO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const url = `https://www.librarything.com/services/rest/1.1/?method=librarything.ck.search&q=${encodeURIComponent(consulta.titulo)}&max=1&responseType=json`;
    const dados = await fetchJson<{ response?: { works?: LibraryThingWork[] } }>(url);
    const obra = dados.response?.works?.[0];
    if (!obra?.rating?.num_ratings || obra.rating.num_ratings <= 0) return [];
    const stats = estatisticas("0-5");
    return [
      {
        fonte: this.id,
        rating: stats.media,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: `https://www.librarything.com/work/${obra.id}`,
      },
    ];
  }
}
