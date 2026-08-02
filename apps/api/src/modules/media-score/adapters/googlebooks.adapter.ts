import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface GoogleBooksItem {
  volumeInfo?: { averageRating?: number; ratingsCount?: number; infoLink?: string };
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
    const item = dados.items?.find((i) => i.volumeInfo?.averageRating != null);
    if (!item?.volumeInfo?.averageRating) return [];
    const stats = estatisticas("0-5");
    return [
      {
        fonte: this.id,
        rating: item.volumeInfo.averageRating,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        url: item.volumeInfo.infoLink,
      },
    ];
  }
}
