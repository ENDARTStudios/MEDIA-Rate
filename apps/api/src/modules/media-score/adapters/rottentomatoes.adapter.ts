import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchTexto, UA_BROWSER } from "./http.utils.js";

/**
 * Rotten Tomatoes — sem API pública. A página do filme/série embute um bloco
 * JSON com DUAS notas distintas:
 *  - `criticsScore` (Tomatometer, crítica);
 *  - `audienceScore` (Popcornmeter, público).
 *
 * T-DADOS-27: até aqui o adaptador lia o `ratingValue` do JSON-LD, que é o
 * **AudienceScore**, e gravava como se fosse a nota de CRÍTICA. Agora cada
 * bloco alimenta a fonte correta do source-registry (`rottentomatoes` e
 * `rottentomatoes_audience`) e a página é conferida por identidade
 * (`releaseYear`; título como fallback) — o slug é um palpite e páginas
 * homônimas de outra obra já foram coletadas por engano.
 *
 * Scraping numérico ISOLADO — gate SCRAPE_NUMERICO_ENABLED=true.
 */

/** T176: URL por tipo (/m/ filme, /tv/ série) com slug underscore. */
export function urlRottenTomatoes(consulta: ConsultaMedia): string {
  const slug =
    consulta.idsExternos?.rottentomatoes ??
    consulta.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  const segmento = consulta.tipo === "SERIE" ? "tv" : "m";
  return `https://www.rottentomatoes.com/${segmento}/${slug}`;
}

/** O bloco de notas vem como string JSON escapada dentro de um <script>. */
function desescapar(html: string): string {
  return html.replace(/\\"/g, '"');
}

/** Ano de lançamento da obra da página (`releaseYear`). */
export function extrairAnoRt(html: string): number | null {
  const m = desescapar(html).match(/"releaseYear":"(\d{4})"/);
  return m ? Number(m[1]) : null;
}

/** Nota + nº de reviews de um bloco (`criticsScore` ou `audienceScore`). */
export function extrairNotaRt(
  html: string,
  chave: "criticsScore" | "audienceScore",
): { score: number; votos?: number } | null {
  const json = desescapar(html);
  const inicio = json.indexOf(`"${chave}":{`);
  if (inicio < 0) return null;
  const fim = json.indexOf("}", inicio);
  if (fim < 0) return null;
  const bloco = json.slice(inicio, fim + 1);
  const m = bloco.match(/"score":"?(\d{1,3})"?/);
  if (!m) return null;
  const score = Number(m[1]);
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  const v = bloco.match(/"reviewCount":(\d+)/);
  return { score, ...(v ? { votos: Number(v[1]) } : {}) };
}

/** Fallback: JSON-LD `aggregateRating` só quando nomeado como AudienceScore. */
function extrairPublicoJsonLd(html: string): { score: number; votos?: number } | null {
  const bloco = html.match(/"aggregateRating":\{([^}]*)\}/)?.[1];
  if (!bloco || !/AudienceScore|Popcornmeter/i.test(bloco)) return null;
  const nota = bloco.match(/"ratingValue":"?(\d{1,3})"?/);
  if (!nota) return null;
  const score = Number(nota[1]);
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  const v = bloco.match(/"reviewCount":(\d+)/);
  return { score, ...(v ? { votos: Number(v[1]) } : {}) };
}

function tituloDaPagina(html: string): string {
  const bruto = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
  return bruto
    .replace(/\s*\|\s*Rotten Tomatoes\s*$/i, "")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

function normalizarTitulo(titulo: string | null | undefined): string {
  return String(titulo ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the\s+/, "")
    .replace(/\s+(19|20)\d{2}$/, "")
    .trim();
}

/** Identidade pelo título (RT exibe título internacional — testa os 3 nomes). */
export function titulosConferemRt(consulta: ConsultaMedia, pagina: string): boolean {
  const alvo = normalizarTitulo(pagina);
  if (!alvo) return false;
  return [consulta.titulo, consulta.tituloOriginal, consulta.tituloEn]
    .map(normalizarTitulo)
    .filter(Boolean)
    .some((c) => c === alvo);
}

/** Ano da página: `releaseYear` ou o "(YYYY)" do título. */
export function extrairAnoDaPagina(html: string): number | null {
  const direto = extrairAnoRt(html);
  if (direto != null) return direto;
  const m = tituloDaPagina(html).match(/\((\d{4})\)\s*$/);
  return m ? Number(m[1]) : null;
}

/** Página é da mesma obra? Ano é o sinal forte; sem ano, confere o título. */
export function identidadeConfereRt(consulta: ConsultaMedia, html: string): boolean {
  const anoPagina = extrairAnoDaPagina(html);
  if (consulta.ano != null && anoPagina != null) {
    return Math.abs(anoPagina - consulta.ano) <= 1;
  }
  return titulosConferemRt(consulta, tituloDaPagina(html));
}

/**
 * RT usa `/m/<slug>_<ano>` para obras homônimas (ex.: karate_kid_2010). Só se
 * aplica ao slug derivado do título — id externo é URL canônica.
 */
function urlComAno(consulta: ConsultaMedia, url: string): string | null {
  if (consulta.tipo === "SERIE" || consulta.ano == null) return null;
  if (consulta.idsExternos?.rottentomatoes) return null;
  if (url.endsWith(`_${consulta.ano}`)) return null;
  return `${url}_${consulta.ano}`;
}

export class RottenTomatoesAdapter implements FonteAdapter {
  readonly id = "rottentomatoes";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie";
  }

  ativo(): boolean {
    return process.env.SCRAPE_NUMERICO_ENABLED === "true";
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const opcoes = { headers: { "User-Agent": UA_BROWSER, "Accept": "text/html" } };
    let url = urlRottenTomatoes(consulta);
    let html = await fetchTexto(url, opcoes);

    // T-DADOS-27: o slug é um palpite — só atribui nota quando a página é da
    // mesma obra. Ao bater em obra homônima de outro ano, tenta a variante
    // `/m/<slug>_<ano>` antes de desistir (é a convenção do próprio RT).
    if (!identidadeConfereRt(consulta, html)) {
      const alternativa = urlComAno(consulta, url);
      const htmlAlternativo = alternativa
        ? await fetchTexto(alternativa, opcoes).catch(() => null)
        : null;
      if (alternativa && htmlAlternativo && identidadeConfereRt(consulta, htmlAlternativo)) {
        url = alternativa;
        html = htmlAlternativo;
      } else {
        return [];
      }
    }

    const stats = estatisticas("0-100");
    const notas: NotaColetada[] = [];
    const critica = extrairNotaRt(html, "criticsScore");
    if (critica) {
      notas.push({
        fonte: "rottentomatoes",
        rating: critica.score,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        ...(critica.votos != null ? { votos: critica.votos } : {}),
        url,
      });
    }
    const publico = extrairNotaRt(html, "audienceScore") ?? extrairPublicoJsonLd(html);
    if (publico) {
      notas.push({
        fonte: "rottentomatoes_audience",
        rating: publico.score,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        ...(publico.votos != null ? { votos: publico.votos } : {}),
        url,
      });
    }
    return notas;
  }
}
