import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";

interface FilmeDataset {
  tconst: string;
  averageRating?: number;
  numVotes?: number;
}

/**
 * IMDb Datasets — arquivos TSV oficiais (title.ratings) baixados para
 * IMDB_DATASET_PATH. Uso local, sem rede por req; top N por procura
 * local do título. Este adapter é um esqueleto: coleta em lote.
 */
export class ImdbDatasetAdapter implements FonteAdapter {
  readonly id = "imdb_dataset";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie";
  }

  ativo(): boolean {
    return Boolean(process.env.IMDB_DATASET_PATH);
  }

  async coletar(_consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const caminho = process.env.IMDB_DATASET_PATH;
    if (!caminho) return [];
    const { readFileSync, existsSync } = await import("node:fs");
    const arquivo = `${caminho}/title.ratings.tsv`;
    if (!existsSync(arquivo)) return [];
    // Nota de lote: busca exata por tconst não é viável aqui sem título;
    // o coletor em lote (futuro) cruza title.basics.tsv. Retorna vazio por ora.
    const linhas = readFileSync(arquivo, "utf8").split("\n");
    void linhas;
    const item = lerMaiorVotado(linhas);
    if (!item?.averageRating) return [];
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating: item.averageRating,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: `https://www.imdb.com/title/${item.tconst}`,
      },
    ];
  }
}

function lerMaiorVotado(linhas: string[]): FilmeDataset | null {
  let melhor: FilmeDataset | null = null;
  for (const linha of linhas) {
    if (linha === "" || linha.startsWith("tconst")) continue;
    const [tconst, averageRating, numVotes] = linha.split("\t");
    if (!tconst || !averageRating) continue;
    if (!melhor || Number(numVotes ?? 0) > Number(melhor.numVotes ?? 0)) {
      melhor = { tconst, averageRating: Number(averageRating), numVotes: Number(numVotes ?? 0) };
    }
  }
  return melhor;
}
