import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { postJson } from "./http.utils.js";

interface AniListMedia {
  data?: {
    Media?: {
      averageScore?: number;
      siteUrl?: string;
      statistics?: { scoreDistribution?: { amount?: number }[] };
    };
  };
}

/** AniList GraphQL — gratuita; averageScore 0–100 (público); ÷10. */
export class AniListAdapter implements FonteAdapter {
  readonly id = "anilist";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "anime_manga";
  }

  ativo(): boolean {
    return true;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const query = `query ($q: String) { Media(search: $q, type: ANIME) { averageScore siteUrl statistics { scoreDistribution { amount } } } }`;
    const corpo = JSON.stringify({ query, variables: { q: consulta.titulo } });
    const dados = await postJson<AniListMedia>("https://graphql.anilist.co", corpo, {
      headers: { "content-type": "application/json" },
    });
    const score = dados.data?.Media?.averageScore;
    if (!score) return [];
    const stats = estatisticas("0-100");
    // Soma a distribuição de notas (mesmo padrão do MangaDex) — contagem real
    // de quem pontuou, em vez de `popularity` (usuários com a obra em lista).
    const distribuicao = dados.data?.Media?.statistics?.scoreDistribution;
    const votos = distribuicao
      ? distribuicao.reduce((acc, d) => acc + (Number(d.amount) || 0), 0)
      : 0;
    return [
      {
        fonte: this.id,
        rating: score,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: votos > 0 ? votos : undefined,
        url: dados.data?.Media?.siteUrl,
      },
    ];
  }
}
