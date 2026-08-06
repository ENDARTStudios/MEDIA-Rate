import { Injectable } from "@nestjs/common";

/**
 * Seed do grafo RelacaoObra via Wikidata SPARQL (Addendum 3, Parte 2):
 * propriedade P144 ("based on") conecta obras across-mídia de forma
 * estruturada e gratuita.
 *
 * Estratégia em LOTE (2 queries para N títulos — sem N+1 de rede):
 *  1. "obras que ADAPTAM as nossas":  ?obra wdt:P144 ?base .  (?base ∈ catálogo)
 *  2. "obras que são BASE das nossas": ?obra wdt:P144 ?base .  (?obra ∈ catálogo)
 * O match com o catálogo é por rótulo pt (slugify normalizado).
 *
 * Graceful degradation: timeout 15s por request, retry limitado (2),
 * fonte indisponível → retorna [] e loga (nunca quebra o seed).
 */
@Injectable()
export class WikidataSeedService {
  private readonly endpoint = "https://query.wikidata.org/sparql";
  private readonly timeoutMs = 15_000;

  /** Slug simples pt: minúsculas, sem acentos, espaços → hífen. */
  private slugify(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private escapeLabel(label: string): string {
    return label.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  /**
   * Consulta SPARQL batched. Retorna pares {obraLabel, baseLabel} (pt).
   * @param modo 'adaptacoes' → obras que adaptam as nossas; 'bases' → obras
   *   que são base das nossas.
   */
  private async consultar(
    titulos: string[],
    modo: "adaptacoes" | "bases",
  ): Promise<{ obraLabel: string; baseLabel: string }[]> {
    const values = titulos
      .slice(0, 60)
      .map((t) => `"${this.escapeLabel(t)}"@pt`)
      .join(" ");

    const query =
      modo === "adaptacoes"
        ? `SELECT DISTINCT ?obraLabel ?baseLabel WHERE {
             VALUES ?baseLabel { ${values} }
             ?obra wdt:P144 ?base .
             ?base rdfs:label ?baseLabel .
             ?obra rdfs:label ?obraLabel .
             FILTER(LANG(?obraLabel) = "pt")
           } LIMIT 300`
        : `SELECT DISTINCT ?obraLabel ?baseLabel WHERE {
             VALUES ?obraLabel { ${values} }
             ?obra wdt:P144 ?base .
             ?obra rdfs:label ?obraLabel .
             ?base rdfs:label ?baseLabel .
             FILTER(LANG(?baseLabel) = "pt")
           } LIMIT 300`;

    let ultimoErro: unknown = null;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        const url = new URL(this.endpoint);
        url.searchParams.set("query", query);
        const res = await fetch(url, {
          headers: {
            "Accept": "application/sparql-results+json",
            "User-Agent": "media-rate-seed/1.0",
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
        const json = (await res.json()) as {
          results?: { bindings?: Record<string, { value: string }>[] };
        };
        const pares = (json.results?.bindings ?? []).flatMap((b) => {
          const obra = b.obraLabel?.value;
          const base = b.baseLabel?.value;
          return obra && base ? [{ obraLabel: obra, baseLabel: base }] : [];
        });
        return pares;
      } catch (err) {
        ultimoErro = err;
        // backoff simples entre tentativas
        await new Promise((r) => setTimeout(r, 500 * (tentativa + 1)));
      }
    }
    console.warn(`[wikidata] fonte indisponível (modo=${modo}): ${String(ultimoErro)}`);
    return [];
  }

  /**
   * Popula arestas ADAPTACAO_DE a partir do Wikidata, cruzando por rótulo
   * com o catálogo local. origem = obra adaptação; destino = obra base.
   * @param catalogo [{id, titulo}] mídias existentes (top N do catálogo).
   */
  async buscarArestas(
    catalogo: { id: string; titulo: string }[],
  ): Promise<{ origemId: string; destinoId: string; tipo: "ADAPTACAO_DE" }[]> {
    if (catalogo.length === 0) return [];

    const porSlug = new Map<string, string>();
    for (const m of catalogo) {
      const slug = this.slugify(m.titulo);
      if (!porSlug.has(slug)) porSlug.set(slug, m.id);
    }
    const titulos = catalogo.map((m) => m.titulo);

    const [adaptacoes, bases] = await Promise.all([
      this.consultar(titulos, "adaptacoes"),
      this.consultar(titulos, "bases"),
    ]);

    const arestas: { origemId: string; destinoId: string; tipo: "ADAPTACAO_DE" }[] = [];
    const vistos = new Set<string>();

    // Nossa obra é a BASE → a obra encontrada é a adaptação (origem).
    for (const par of bases) {
      const origemId = porSlug.get(this.slugify(par.obraLabel));
      const destinoId = porSlug.get(this.slugify(par.baseLabel));
      if (!origemId || !destinoId || origemId === destinoId) continue;
      const chave = `${origemId}|${destinoId}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      arestas.push({ origemId, destinoId, tipo: "ADAPTACAO_DE" });
    }

    // Nossa obra é a ADAPTAÇÃO → a base é o destino.
    for (const par of adaptacoes) {
      const origemId = porSlug.get(this.slugify(par.obraLabel));
      const destinoId = porSlug.get(this.slugify(par.baseLabel));
      if (!origemId || !destinoId || origemId === destinoId) continue;
      const chave = `${origemId}|${destinoId}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      arestas.push({ origemId, destinoId, tipo: "ADAPTACAO_DE" });
    }

    return arestas;
  }
}
