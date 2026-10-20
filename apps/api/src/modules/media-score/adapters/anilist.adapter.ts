import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { ErroColeta, postJson } from "./http.utils.js";

interface AniListMedia {
  data?: {
    Media?: {
      averageScore?: number;
      siteUrl?: string;
      stats?: { scoreDistribution?: { amount?: number }[] };
    };
  };
  errors?: { message?: string }[];
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
    // D-233: busca MANGA para mangá, ANIME para animação (anime estava
    // retornando a nota da obra animada em vez da obra em mangá).
    const tipoAni = consulta.tipo === "MANGA" ? "MANGA" : "ANIME";
    // T-DADOS-43: o campo é `stats` (a query usava `statistics`, inválido —
    // a API respondia HTTP 400 e a fonte nunca rendeu uma linha).
    const query = `query ($q: String) { Media(search: $q, type: ${tipoAni}) { averageScore siteUrl stats { scoreDistribution { amount } } } }`;
    const corpo = JSON.stringify({ query, variables: { q: consulta.titulo } });
    const dados = await postJson<AniListMedia>("https://graphql.anilist.co", corpo, {
      headers: { "content-type": "application/json" },
    });
    // D-cota: erro GraphQL (mesmo com HTTP 200) é "não respondeu", não
    // "sem nota" — lança para preservar a linha existente.
    if (dados.errors?.length) throw new ErroColeta("AniList: resposta GraphQL com erro");
    const media = dados.data?.Media;
    const score = media?.averageScore;
    if (!score) return [];
    const stats = estatisticas("0-100");
    // Soma a distribuição de notas (mesmo padrão do MangaDex) — contagem real
    // de quem pontuou, em vez de `popularity` (usuários com a obra em lista).
    const distribuicao = media?.stats?.scoreDistribution;
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
        url: media?.siteUrl,
      },
    ];
  }
}
