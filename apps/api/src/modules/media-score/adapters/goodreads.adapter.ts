import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson, fetchTexto, UA_BROWSER } from "./http.utils.js";
import { extrairRatingLivroJsonLd, parseNumero } from "./scrape-numerico.util.js";

/**
 * Goodreads — sem API pública estável. O id da obra é NUMÉRICO: montar a URL
 * com slug do título (`/book/show/la-divina-commedia`) devolve 404 em 100% dos
 * casos (T-DADOS-31). Fluxo:
 *   1. `/book/auto_complete?format=json&q=<titulo>` resolve o `bookId`;
 *   2. `/book/show/<bookId>` expõe JSON-LD `Book` com aggregateRating 0–5.
 * Scraping numérico ISOLADO — gate MEDIA_PREPARACAO_ENABLED=true (§IV).
 */

/** Normalização de identidade: caixa, acentos e pontuação não distinguem. */
export function normalizarTituloGoodreads(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Ano do item, quando a fonte expõe (hoje o autocomplete NÃO traz
 * `originalPublicationYear`; o guard fica pronto para quando/se vier).
 */
function anoDoItem(item: Record<string, unknown>): number | null {
  for (const campo of [
    "originalPublicationYear",
    "publicationYear",
    "publishedYear",
    "year",
  ] as const) {
    const ano = parseNumero(item[campo]);
    if (ano != null) return Math.trunc(ano);
  }
  return null;
}

/**
 * Escolhe o `bookId` SOMENTE se o título normalizado for idêntico ao da
 * consulta (nunca o primeiro resultado sem guarda). Com `consulta.ano`
 * presente e ano no item, aceita diferença de até 2 anos (edição ≠ publicação).
 */
export function selecionarBookIdGoodreads(dados: unknown, consulta: ConsultaMedia): string | null {
  if (!Array.isArray(dados)) return null;
  const alvo = normalizarTituloGoodreads(consulta.titulo);
  if (!alvo) return null;

  for (const entrada of dados) {
    if (typeof entrada !== "object" || entrada === null) continue;
    const item = entrada as Record<string, unknown>;
    const bookId = String(item.bookId ?? "").trim();
    if (!/^\d+$/.test(bookId)) continue;
    if (typeof item.title !== "string") continue;
    if (normalizarTituloGoodreads(item.title) !== alvo) continue;

    const anoItem = anoDoItem(item);
    if (consulta.ano != null && anoItem != null && Math.abs(consulta.ano - anoItem) > 2) {
      continue;
    }
    return bookId;
  }
  return null;
}

export class GoodreadsAdapter implements FonteAdapter {
  readonly id = "goodreads";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "livro";
  }

  ativo(): boolean {
    return process.env.MEDIA_PREPARACAO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const bookId = await this.resolverBookId(consulta);
    if (!bookId) return [];

    // Id numérico — nunca slug do título.
    const url = `https://www.goodreads.com/book/show/${bookId}`;
    const html = await fetchTexto(url, {
      headers: { "user-agent": UA_BROWSER, "accept": "text/html" },
    });
    const rating = extrairRatingLivroJsonLd(html);
    if (rating == null) return [];

    const stats = estatisticas("0-5");
    return [
      {
        fonte: this.id,
        rating: rating.ratingValue,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        ...(rating.ratingCount != null ? { votos: rating.ratingCount } : {}),
        url,
      },
    ];
  }

  private async resolverBookId(consulta: ConsultaMedia): Promise<string | null> {
    // Um id externo só é aceito se já for NUMÉRICO; slug/qualquer outra coisa
    // é ignorado e a identidade é re-resolvida pelo autocomplete.
    const externo = consulta.idsExternos?.goodreads?.trim();
    if (externo && /^\d+$/.test(externo)) return externo;

    const titulo = consulta.titulo.replace(/\s+/g, " ").trim();
    if (!titulo) return null;

    const url = `https://www.goodreads.com/book/auto_complete?format=json&q=${encodeURIComponent(titulo)}`;
    const dados = await fetchJson<unknown>(url, {
      headers: { "user-agent": UA_BROWSER, "accept": "application/json" },
    });
    return selecionarBookIdGoodreads(dados, consulta);
  }
}
