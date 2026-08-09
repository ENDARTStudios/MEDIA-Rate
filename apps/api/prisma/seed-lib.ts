/* eslint-disable no-console */
// ============================================================
// T222 v2 — biblioteca compartilhada dos seeds (STANDALONE).
// SEM imports de src/ — roda localmente e dentro do container de
// produção (dist/ + node_modules/ + prisma/).
//
// Contém:
//  1. Wikidata SPARQL (P144 "based on") — extraído de
//     wikidata-seed.service.ts (mesma lógica, funções puras).
//  2. recalcularScoreSeed — recálculo MÍNIMO de score para seeds:
//     mídias recém-criadas não têm avaliações → score v3 = prior (7.0);
//     com avaliações → média aritmética (aproximação seed-scope — o
//     engine completo com z-scores vive no app, não no seed).
// ============================================================

import { PrismaClient } from "@prisma/client";

// ---------- Wikidata SPARQL (P144) ----------

export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeLabel(label: string): string {
  return label.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const WIKIDATA_TIMEOUT_MS = 15_000;

async function consultarWikidata(
  titulos: string[],
  modo: "adaptacoes" | "bases",
): Promise<{ obraLabel: string; baseLabel: string }[]> {
  const values = titulos
    .slice(0, 60)
    .map((t) => `"${escapeLabel(t)}"@pt`)
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
      const url = new URL(WIKIDATA_ENDPOINT);
      url.searchParams.set("query", query);
      const res = await fetch(url, {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "media-rate-seed/1.0",
        },
        signal: AbortSignal.timeout(WIKIDATA_TIMEOUT_MS),
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
export async function buscarArestasWikidata(
  catalogo: { id: string; titulo: string }[],
): Promise<{ origemId: string; destinoId: string; tipo: "ADAPTACAO_DE" }[]> {
  if (catalogo.length === 0) return [];

  const porSlug = new Map<string, string>();
  for (const m of catalogo) {
    const slug = slugify(m.titulo);
    if (!porSlug.has(slug)) porSlug.set(slug, m.id);
  }
  const titulos = catalogo.map((m) => m.titulo);

  const [adaptacoes, bases] = await Promise.all([
    consultarWikidata(titulos, "adaptacoes"),
    consultarWikidata(titulos, "bases"),
  ]);

  const arestas: { origemId: string; destinoId: string; tipo: "ADAPTACAO_DE" }[] = [];
  const vistos = new Set<string>();

  for (const par of [...bases, ...adaptacoes]) {
    const origemId = porSlug.get(slugify(par.obraLabel));
    const destinoId = porSlug.get(slugify(par.baseLabel));
    if (!origemId || !destinoId || origemId === destinoId) continue;
    const chave = `${origemId}|${destinoId}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    arestas.push({ origemId, destinoId, tipo: "ADAPTACAO_DE" });
  }

  return arestas;
}

// ---------- Score mínimo (v3, prior) ----------

/**
 * Recálculo de score para seeds: mídias recém-criadas NÃO têm avaliações
 * → score v3 = prior do catálogo (7.0, num_fontes 0). Com avaliações,
 * média aritmética simples (aproximação seed-scope). Persiste em
 * media_score e desnormaliza em midia.score (mesmo contrato do app).
 */
export async function recalcularScoreSeed(
  prisma: PrismaClient,
  midiaId: string,
): Promise<number> {
  const midia = await prisma.midia.findUnique({
    where: { id: midiaId },
    select: { id: true, avaliacoes: { select: { rating: true } } },
  });
  if (!midia) return 7;

  const avaliacoes = midia.avaliacoes ?? [];
  const num_fontes = avaliacoes.length;
  const score =
    num_fontes > 0
      ? Number(
          (avaliacoes.reduce((acc, a) => acc + (a.rating ?? 0), 0) / num_fontes).toFixed(2),
        )
      : 7; // v3 sem fontes = prior C (7.0)

  const data = {
    score,
    num_fontes,
    pesos_usados: {} as Record<string, number>,
    score_critica: null,
    score_publico: null,
    consenso: null,
    indice_consenso: null,
    votos_total: 0,
    confianca: 0,
    detalhes: { origem: "seed" } as Record<string, string>,
  };

  await prisma.mediaScore.upsert({
    where: { midia_id: midiaId },
    create: { midia_id: midiaId, ...data },
    update: data,
  });
  await prisma.midia.update({ where: { id: midiaId }, data: { score } });

  return score;
}
