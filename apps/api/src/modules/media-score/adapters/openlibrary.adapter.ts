import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface OpenLibrarySearchResult {
  docs?: {
    key?: string;
    title?: string;
    title_suggest?: string;
    ratings_average?: number;
    ratings_count?: number;
  }[];
}

interface OpenLibraryRatingsResult {
  summary?: {
    average?: number;
    count?: number;
  };
}

/** Id de work utilizável: OL<dígitos>W (ex.: OL471932W). */
function idOpenLibraryUtilizavel(id: string | undefined): id is string {
  return typeof id === "string" && /^OL[0-9]+W$/.test(id.trim());
}

/** Extrai `OL<dígitos>W` de `/works/OL471932W` (formato de `doc.key`). */
function idDoKey(key: string | undefined): string | null {
  const m = /^\/works\/(OL[0-9]+W)$/.exec(String(key ?? "").trim());
  return m?.[1] ?? null;
}

/** Remove aspas (quebram a URL/busca) e colapsa espaços. */
export function sanitizarTituloOpenLibrary(titulo: string): string {
  return titulo.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
}

/** Normaliza título para validação de identidade (caixa, acentos, pontuação). */
export function normalizarTituloOpenLibrary(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Open Library — API aberta; ratings_average 0–5 (público). ×2. */
export class OpenLibraryAdapter implements FonteAdapter {
  readonly id = "openlibrary";

  private readonly fasePreparacao = process.env.MEDIA_PREPARACAO_ENABLED === "true";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "livro";
  }

  ativo(): boolean {
    return this.fasePreparacao;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const idExterno = consulta.idsExternos?.openlibrary?.trim();
    // T-DADOS-07: com o id exato da obra (`fonte_id` gravado pelo import), o
    // endpoint de ratings do work é a identidade — nada de `search` textual,
    // que aceitava o primeiro resultado e podia gravar a nota de outro livro.
    if (idOpenLibraryUtilizavel(idExterno)) {
      return this.porId(idExterno);
    }
    return this.porTitulo(consulta, idExterno);
  }

  private async porId(id: string): Promise<NotaColetada[]> {
    const dados = await fetchJson<OpenLibraryRatingsResult>(
      `https://openlibrary.org/works/${id}/ratings.json`,
    );
    const nota = dados.summary?.average;
    if (!nota || nota <= 0) return [];
    return [this.nota(nota, dados.summary?.count, `https://openlibrary.org/works/${id}`)];
  }

  private async porTitulo(
    consulta: ConsultaMedia,
    idExterno: string | undefined,
  ): Promise<NotaColetada[]> {
    const titulo = sanitizarTituloOpenLibrary(consulta.titulo);
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(titulo)}&fields=key,title,title_suggest,ratings_average,ratings_count&limit=1`;
    const dados = await fetchJson<OpenLibrarySearchResult>(url);
    const doc = dados.docs?.[0];
    if (!doc?.ratings_average || doc.ratings_average <= 0) return [];

    // Validação de identidade do fallback: sem ela o primeiro resultado do
    // `search` pode ser outro livro (título homônimo/edição) e a nota vaza.
    if (idExterno) {
      const idDoDoc = idDoKey(doc.key);
      if (!idDoDoc || idDoDoc !== idExterno.toUpperCase()) return [];
    } else {
      const alvo = normalizarTituloOpenLibrary(consulta.titulo);
      const titulosDoc = [doc.title, doc.title_suggest]
        .filter((v): v is string => typeof v === "string")
        .map(normalizarTituloOpenLibrary);
      if (!titulosDoc.includes(alvo)) return [];
    }

    return [
      this.nota(
        doc.ratings_average,
        doc.ratings_count,
        `https://openlibrary.org/search?q=${encodeURIComponent(titulo)}`,
      ),
    ];
  }

  private nota(rating: number, votos: number | undefined, url: string): NotaColetada {
    const stats = estatisticas("0-5");
    return {
      fonte: this.id,
      rating,
      media_fonte: stats.media,
      desvio_fonte: stats.desvio,
      votos,
      url,
    };
  }
}
