import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface GoogleBooksItem {
  volumeInfo?: {
    title?: string;
    averageRating?: number;
    ratingsCount?: number;
    infoLink?: string;
  };
}

function normalizarTituloGoogle(titulo: string): string {
  return String(titulo ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the\s+/, "")
    .trim();
}

/**
 * T-DADOS-49: escolhe o volume da MESMA obra.
 * A busca `q=<título>` do Google Books casa por relevância e devolve livros
 * parecidos — auditoria de 40 amostras: **4 reais erradas** (`O Alquimista` →
 * "Por que Paulo Coelho teve sucesso"; `To All the Boys…` → a continuação
 * "P.S. I Still Love You"; `2001` → livro de direito internacional;
 * `Twisted Lies` → obra sem relação). O adapter pegava o primeiro volume COM
 * nota, sem conferir nada. A conferência usa o título normalizado (catálogo:
 * `titulo`/`tituloOriginal`/`tituloEn`); sem match → lacuna honesta.
 */
export function escolherVolumeGoogleBooks(
  itens: GoogleBooksItem[] | undefined,
  consulta: ConsultaMedia,
): GoogleBooksItem | null {
  const comNota = (itens ?? []).filter((i) => i.volumeInfo?.averageRating != null);
  if (comNota.length === 0) return null;
  const alvos = [consulta.titulo, consulta.tituloOriginal, consulta.tituloEn]
    .map((t) => normalizarTituloGoogle(String(t ?? "")))
    .filter(Boolean);
  for (const item of comNota) {
    const n = normalizarTituloGoogle(item.volumeInfo?.title ?? "");
    if (!n) continue;
    if (alvos.some((a) => a === n || (a.length > 3 && (n.includes(a) || a.includes(n))))) {
      return item;
    }
  }
  return null;
}

/** Google Books API — key gratuita (GOOGLE_BOOKS_API_KEY). averageRating 0–5. ×2. */
export class GoogleBooksAdapter implements FonteAdapter {
  readonly id = "googlebooks";

  private chave(): string | undefined {
    return process.env.GOOGLE_BOOKS_API_KEY;
  }

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "livro";
  }

  ativo(): boolean {
    return Boolean(this.chave());
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const params = new URLSearchParams({ q: consulta.titulo });
    if (this.chave()) params.set("key", this.chave() ?? "");
    const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
    const dados = await fetchJson<{ items?: GoogleBooksItem[] }>(url);
    const item = escolherVolumeGoogleBooks(dados.items, consulta);
    if (!item?.volumeInfo?.averageRating) return [];
    const stats = estatisticas("0-5");
    return [
      {
        fonte: this.id,
        rating: item.volumeInfo.averageRating,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: item.volumeInfo.ratingsCount,
        url: item.volumeInfo.infoLink,
      },
    ];
  }
}
