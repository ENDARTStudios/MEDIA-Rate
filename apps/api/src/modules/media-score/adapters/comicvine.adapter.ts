import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo } from "./fonte-adapter.interface.js";

/** Comic Vine — key gratuita (COMICVINE_API_KEY); sem nota agregada de volumes. */
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

  async coletar(_consulta: ConsultaMedia): Promise<NotaColetada[]> {
    // O ComicVine não expõe nota agregada (usuário/crítica) para volumes.
    // Retornamos vazio para não inventar uma nota sintética.
    return [];
  }
}
