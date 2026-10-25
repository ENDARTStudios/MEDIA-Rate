import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { ErroColeta, fetchJson, fetchTexto, UA_BROWSER } from "./http.utils.js";
import { extrairRatingLivroJsonLd, parseNumero } from "./scrape-numerico.util.js";

/**
 * Goodreads — sem API pública estável. O id da obra é NUMÉRICO: montar a URL
 * com slug do título (`/book/show/la-divina-commedia`) devolve 404 em 100% dos
 * casos (T-DADOS-31). Dois caminhos para resolver o `bookId`:
 *
 *   1. POR ISBN (preferencial, T-DADOS-32): quando `idsExternos.openlibrary` é
 *      um work `OL…W`, as edições do OpenLibrary fornecem os ISBNs e o
 *      `/book/auto_complete?q=<isbn>` resolve a obra independentemente do
 *      idioma (título traduzido deixa de derrubar a coleta). Neste caminho a
 *      identidade é o ISBN — NÃO se exige igualdade de título.
 *   2. POR TÍTULO (fallback): autocomplete + guarda estrita de título/ano,
 *      comportamento preservado do T-DADOS-31.
 *
 * Em ambos, `/book/show/<bookId>` expõe JSON-LD `Book` com aggregateRating
 * 0–5. Scraping numérico ISOLADO — gate MEDIA_PREPARACAO_ENABLED=true (§IV).
 */

/** Intervalo mínimo entre chamadas ao Goodreads (cortesia/anti-bloqueio). */
const THROTTLE_GOODREADS_MS = 350;

/** Máximo de ISBNs tentados por obra (custo/latência limitados). */
const MAX_ISBNS = 3;

/** ISBN-10 (X final permitido, normalizado para maiúscula) ou ISBN-13. */
const ISBN_VALIDO = /^(?:\d{9}[\dX]|\d{13})$/;

/** Work do OpenLibrary (`OL<dígitos>W`). */
const WORK_OPENLIBRARY = /^OL\d+W$/;

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

/**
 * Primeiro `bookId` numérico do autocomplete POR ISBN. Aqui a identidade é o
 * ISBN: o título devolvido pode estar em outro idioma e NÃO é comparado.
 */
export function selecionarBookIdPorIsbn(dados: unknown): string | null {
  if (!Array.isArray(dados)) return null;

  for (const entrada of dados) {
    if (typeof entrada !== "object" || entrada === null) continue;
    const bookId = String((entrada as Record<string, unknown>).bookId ?? "").trim();
    if (/^\d+$/.test(bookId)) return bookId;
  }
  return null;
}

function normalizarIsbn(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim().replace(/[-\s]/g, "").toUpperCase();
  return ISBN_VALIDO.test(limpo) ? limpo : null;
}

/** Entries do `editions.json`: formato atual (`entries`) e legado (`results.entries`). */
function entradasDasEdicoes(dados: unknown): unknown[] {
  if (typeof dados !== "object" || dados === null) return [];
  const raiz = dados as Record<string, unknown>;
  if (Array.isArray(raiz.entries)) return raiz.entries;

  const results = raiz.results;
  if (typeof results === "object" && results !== null) {
    const entries = (results as Record<string, unknown>).entries;
    if (Array.isArray(entries)) return entries;
  }
  return [];
}

/**
 * Extrai até `limite` ISBNs das edições do OpenLibrary, preferindo `isbn_13`
 * e depois `isbn_10`, sem duplicatas. A ordem final é determinística:
 * todos os 13 dígitos (na ordem das edições) antes dos 10 dígitos.
 */
export function isbnsDasEdicoesOpenLibrary(dados: unknown, limite = MAX_ISBNS): string[] {
  const entradas = entradasDasEdicoes(dados);
  const isbns: string[] = [];
  const vistos = new Set<string>();

  for (const campo of ["isbn_13", "isbn_10"] as const) {
    for (const entrada of entradas) {
      if (typeof entrada !== "object" || entrada === null) continue;
      const lista = (entrada as Record<string, unknown>)[campo];
      if (!Array.isArray(lista)) continue;

      for (const bruto of lista) {
        const isbn = normalizarIsbn(bruto);
        if (!isbn || vistos.has(isbn)) continue;
        vistos.add(isbn);
        isbns.push(isbn);
        if (isbns.length >= limite) return isbns;
      }
    }
  }
  return isbns;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GoodreadsAdapter implements FonteAdapter {
  readonly id = "goodreads";

  private ultimaChamadaGoodreads = 0;

  constructor(private readonly throttleMs: number = THROTTLE_GOODREADS_MS) {}

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "livro";
  }

  ativo(): boolean {
    return process.env.MEDIA_PREPARACAO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    try {
      const bookId = await this.resolverBookId(consulta);
      if (!bookId) return [];

      // Id numérico — nunca slug do título.
      const url = `https://www.goodreads.com/book/show/${bookId}`;
      const html = await this.comThrottle(() =>
        fetchTexto(url, {
          headers: { "user-agent": UA_BROWSER, "accept": "text/html" },
        }),
      );
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
    } catch (erro) {
      // D-cota/T-DADOS-43: fonte que NÃO respondeu (HTTP 403/429/5xx, timeout)
      // não é "sem nota" — deixa o ColetaService marcar `erro` e preservar a
      // linha existente. Falha de parse segue como lacuna honesta.
      if (erro instanceof ErroColeta) throw erro;
      return [];
    }
  }

  /** Garante o intervalo mínimo entre chamadas ao Goodreads (não ao OpenLibrary). */
  private async comThrottle<T>(acao: () => Promise<T>): Promise<T> {
    if (this.throttleMs > 0) {
      const espera = this.ultimaChamadaGoodreads + this.throttleMs - Date.now();
      if (espera > 0) await esperar(espera);
    }
    this.ultimaChamadaGoodreads = Date.now();
    return acao();
  }

  private async resolverBookId(consulta: ConsultaMedia): Promise<string | null> {
    // Um id externo só é aceito se já for NUMÉRICO; slug/qualquer outra coisa
    // é ignorado e a identidade é re-resolvida pelo autocomplete.
    const externo = consulta.idsExternos?.goodreads?.trim();
    if (externo && /^\d+$/.test(externo)) return externo;

    const workOpenLibrary = consulta.idsExternos?.openlibrary?.trim();
    if (workOpenLibrary && WORK_OPENLIBRARY.test(workOpenLibrary)) {
      const porIsbn = await this.resolverBookIdPorIsbn(workOpenLibrary);
      if (porIsbn) return porIsbn;
      // Decisão T-DADOS-32: falha do caminho por ISBN NÃO encerra a coleta —
      // cai no fallback por título, que mantém a guarda estrita do T-DADOS-31.
    }

    return this.resolverBookIdPorTitulo(consulta);
  }

  private async resolverBookIdPorIsbn(workId: string): Promise<string | null> {
    const urlEdicoes = `https://openlibrary.org/works/${workId}/editions.json?limit=5&fields=isbn_13,isbn_10`;

    let dados: unknown;
    try {
      dados = await fetchJson<unknown>(urlEdicoes, {
        headers: { "user-agent": UA_BROWSER, "accept": "application/json" },
      });
    } catch {
      return null;
    }

    for (const isbn of isbnsDasEdicoesOpenLibrary(dados)) {
      try {
        const url = `https://www.goodreads.com/book/auto_complete?format=json&q=${encodeURIComponent(isbn)}`;
        const resultado = await this.comThrottle(() =>
          fetchJson<unknown>(url, {
            headers: { "user-agent": UA_BROWSER, "accept": "application/json" },
          }),
        );
        const bookId = selecionarBookIdPorIsbn(resultado);
        if (bookId) return bookId;
      } catch (erro) {
        // Fonte bloqueada/fora do ar: não adianta tentar outro ISBN.
        if (
          erro instanceof ErroColeta &&
          (erro.status === 403 || erro.status === 429 || (erro.status ?? 0) >= 500)
        ) {
          throw erro;
        }
        // ISBN não indexado: tenta o próximo.
      }
    }
    return null;
  }

  private async resolverBookIdPorTitulo(consulta: ConsultaMedia): Promise<string | null> {
    const titulo = consulta.titulo.replace(/\s+/g, " ").trim();
    if (!titulo) return null;

    const url = `https://www.goodreads.com/book/auto_complete?format=json&q=${encodeURIComponent(titulo)}`;
    const dados = await this.comThrottle(() =>
      fetchJson<unknown>(url, {
        headers: { "user-agent": UA_BROWSER, "accept": "application/json" },
      }),
    );
    return selecionarBookIdGoodreads(dados, consulta);
  }
}
