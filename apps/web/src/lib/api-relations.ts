import { api } from "@/lib/http";
import { slugify } from "@/lib/api";

/**
 * Cliente de descoberta cross-mídia (T199, Addendum 3) — consome
 * GET /api/v1/midias/:id/relacoes (bidirecional, sem N+1) com cache curto
 * e graceful degradation: fonte indisponível → null, nunca quebra a página.
 */

export type TipoRelacao =
  | "ADAPTACAO_DE"
  | "SEQUENCIA_DE"
  | "PREQUELA_DE"
  | "SPINOFF_DE"
  | "MESMO_UNIVERSO"
  | "MESMA_HISTORIA_REAL";

export interface RelatedMedia {
  id: string;
  titulo: string;
  tipo: string;
  imagemUrl: string | null;
  score: number | null;
  anoLancamento: number | null;
  slug: string;
  generos: { slug: string; nome: string; tipo: string }[];
}

export interface RelacaoItem {
  id: string;
  tipo: TipoRelacao;
  notaEditorial: string | null;
  direcao: "saida" | "entrada";
  midia: RelatedMedia;
}

export interface RelacoesResponse {
  midiaId: string;
  relacoes: RelacaoItem[];
}

interface ApiRelacao {
  id: string;
  tipo: TipoRelacao;
  nota_editorial?: string | null;
  direcao: "saida" | "entrada";
  midia: {
    id: string;
    titulo: string;
    tipo: string;
    imagem_url: string | null;
    score: number | null;
    ano_lancamento: number | null;
    generos?: { genero: { slug: string; nome: string; tipo: string } }[];
  };
}

export function relacaoFromApi(r: ApiRelacao): RelacaoItem {
  return {
    id: r.id,
    tipo: r.tipo,
    notaEditorial: r.nota_editorial ?? null,
    direcao: r.direcao,
    midia: {
      id: r.midia.id,
      titulo: r.midia.titulo,
      tipo: r.midia.tipo,
      imagemUrl: r.midia.imagem_url,
      score: r.midia.score,
      anoLancamento: r.midia.ano_lancamento,
      slug: slugify(r.midia.titulo),
      generos: (r.midia.generos ?? []).map((g) => g.genero),
    },
  };
}

/** Cache curto (60s) em memória — evita refetch em navegação rápida. */
const cache = new Map<string, { at: number; data: RelacoesResponse | null }>();
const CACHE_TTL_MS = 60_000;

export async function getRelacoes(midiaId: string): Promise<RelacoesResponse | null> {
  if (!midiaId) return null;
  const cached = cache.get(midiaId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  try {
    const data = await api.get<{ midiaId: string; relacoes: ApiRelacao[] }>(
      `/api/v1/midias/${midiaId}/relacoes`,
    );
    const mapped = data
      ? { midiaId: data.midiaId, relacoes: data.relacoes.map(relacaoFromApi) }
      : null;
    cache.set(midiaId, { at: Date.now(), data: mapped });
    return mapped;
  } catch {
    cache.set(midiaId, { at: Date.now(), data: null });
    return null;
  }
}
