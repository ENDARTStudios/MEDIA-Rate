import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface KitsuMedia {
  data?: { attributes?: { averageRating?: string | null; ratingCount?: number | null } }[];
}

/** Kitsu — API pública; averageRating "82.3" (0–100) → ÷10. */
export class KitsuAdapter implements FonteAdapter {
  readonly id = "kitsu";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "anime_manga";
  }

  ativo(): boolean {
    return true;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(consulta.titulo)}`;
    const dados = await fetchJson<KitsuMedia>(url, {
      headers: { accept: "application/vnd.api+json" },
    });
    const media = dados.data?.[0];
    const nota = media?.attributes?.averageRating;
    if (nota == null || nota === "") return [];
    const stats = estatisticas("0-100");
    const ratingCount = Number(media?.attributes?.ratingCount ?? 0);
    return [
      {
        fonte: this.id,
        rating: Number.parseFloat(nota),
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: ratingCount > 0 ? ratingCount : undefined,
      },
    ];
  }
}
