/**
 * relation-graph.ts (T387b, F13) — cálculo puro do grafo de relações sobre
 * metadados. Separado do Prisma para ser testável em unit.
 *
 * Pesos (spec D-357/D-361):
 *  - mesma franquia/universo (titulo_original normalizado) +3
 *  - adaptação cross-mídia (relacao_obra ADAPTACAO_DE) +2
 *  - mesmo autor/criador +2
 *  - mesmo gênero +1
 */
export interface Relacionada {
  id: string;
  motivo: "franquia" | "adaptacao" | "autor" | "genero";
  score: number;
}

export interface FonteRelacao {
  id: string;
  titulo: string;
  generos: string[]; // slugs
  franquia: string; // titulo_original normalizado (minúsculo, sem espaços)
  autores: string[]; // nomes normalizados (minúsculo)
  adaptacoes: string[]; // ids de mídia ligadas por ADAPTACAO_DE
}

function normaliza(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Para UMA mídia-fonte, ranqueia candidatos por relação explicável.
 * Exclui a própria fonte e agrega o maior motivo por candidato.
 */
export function relacionadasDe(fonte: FonteRelacao, candidatos: FonteRelacao[]): Relacionada[] {
  const franquiaFonte = normaliza(fonte.franquia);
  const autoresFonte = new Set(fonte.autores.map(normaliza));
  const generosFonte = new Set(fonte.generos);
  const adaptFonte = new Set(fonte.adaptacoes);

  const mapa = new Map<string, { motivo: Relacionada["motivo"]; score: number }>();

  for (const c of candidatos) {
    if (c.id === fonte.id) continue;
    let motivo: Relacionada["motivo"] | null = null;
    let score = 0;

    if (franquiaFonte && normaliza(c.franquia) === franquiaFonte) {
      motivo = "franquia";
      score = 3;
    } else if (adaptFonte.has(c.id)) {
      motivo = "adaptacao";
      score = 2;
    } else if (autoresFonte.size > 0 && c.autores.some((a) => autoresFonte.has(normaliza(a)))) {
      motivo = "autor";
      score = 2;
    } else if (generosFonte.size > 0 && c.generos.some((g) => generosFonte.has(g))) {
      motivo = "genero";
      score = 1;
    }

    if (!motivo) continue;
    const atual = mapa.get(c.id);
    if (!atual || score > atual.score) mapa.set(c.id, { motivo, score });
  }

  return [...mapa.entries()].map(([id, v]) => ({ id, motivo: v.motivo, score: v.score }));
}
