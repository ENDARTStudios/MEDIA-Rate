import { api } from "@/lib/http";

/**
 * Cliente de interações do usuário (Addendum 4, Parte 3; D-525) — consome
 * GET /api/v1/interacoes (envelope paginado { items, total, porStatus,
 * nextCursor }). Alimenta o feed da dashboard e a biblioteca com dados REAIS
 * do usuário. Graceful degradation: fonte indisponível → null.
 */

export type StatusConsumoApi = "QUERO_CONSUMIR" | "CONSUMINDO" | "CONCLUIDO" | "ABANDONADO";
export type TipoMidiaApi = "FILME" | "SERIE" | "GAME" | "LIVRO" | "MANGA" | "COMIC";

export interface Interacao {
  id: string;
  midiaId: string;
  status: StatusConsumoApi;
  /** ISO string (Fastify serializa Date). */
  atualizadoEm: string;
  midia: {
    id: string;
    slug: string | null;
    titulo: string;
    tipo: string;
    anoLancamento: number | null;
    imagemUrl: string | null;
    score: number | null;
  };
}

export interface InteracoesPagina {
  items: Interacao[];
  /** Total do FILTRO atual (sem considerar paginação). */
  total: number;
  /** Contagens GLOBAIS por status (ignoram filtros) — abas da biblioteca. */
  porStatus: Record<StatusConsumoApi, number>;
  /** Token opaco da próxima página; null = última. */
  nextCursor: string | null;
}

export interface InteracoesQuery {
  status?: StatusConsumoApi;
  tipo?: TipoMidiaApi;
  limit?: number;
  cursor?: string;
}

interface InteracaoApi {
  id: string;
  midia_id: string;
  status: StatusConsumoApi;
  atualizado_em: string;
  midia: {
    id: string;
    slug: string | null;
    titulo: string;
    tipo: string;
    ano_lancamento: number | null;
    imagem_url: string | null;
    score: number | null;
  };
}

interface PaginaApi {
  items: InteracaoApi[];
  total: number;
  porStatus: Record<string, number>;
  nextCursor: string | null;
}

const POR_STATUS_ZERADO: Record<StatusConsumoApi, number> = {
  QUERO_CONSUMIR: 0,
  CONSUMINDO: 0,
  CONCLUIDO: 0,
  ABANDONADO: 0,
};

/** Idade em dias (arredondada p/ baixo), p/ filtro 7/30/365 do feed. */
export function idadeEmDias(iso: string, agora = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((agora - t) / 86_400_000));
}

/** "2 h", "3 dias"… p/ o carimbo temporal do feed (chaves i18n existentes). */
export function tempoRelativoKey(iso: string, agora = Date.now()): string {
  const dias = idadeEmDias(iso, agora);
  if (dias <= 0) {
    const horas = Math.max(1, Math.floor((agora - Date.parse(iso)) / 3_600_000));
    return `recentHours:${horas}`;
  }
  if (dias === 1) return "recentYesterday";
  if (dias < 30) return `recentDays:${dias}`;
  return `recentMonths:${Math.max(1, Math.round(dias / 30))}`;
}

export async function getInteracoes(query: InteracoesQuery = {}): Promise<InteracoesPagina | null> {
  try {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.tipo) params.set("tipo", query.tipo);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.cursor) params.set("cursor", query.cursor);
    const qs = params.toString();
    const data = await api.get<PaginaApi>(`/api/v1/interacoes${qs ? `?${qs}` : ""}`);
    if (!data || !Array.isArray(data.items)) return null;
    return {
      items: data.items.map(mapearInteracao),
      total: data.total ?? data.items.length,
      porStatus: { ...POR_STATUS_ZERADO, ...(data.porStatus ?? {}) },
      nextCursor: data.nextCursor ?? null,
    };
  } catch {
    return null;
  }
}

function mapearInteracao(i: InteracaoApi): Interacao {
  return {
    id: i.id,
    midiaId: i.midia_id,
    status: i.status,
    atualizadoEm: i.atualizado_em,
    midia: {
      id: i.midia?.id ?? i.midia_id,
      slug: i.midia?.slug ?? null,
      titulo: i.midia?.titulo ?? "",
      tipo: i.midia?.tipo ?? "FILME",
      anoLancamento: i.midia?.ano_lancamento ?? null,
      imagemUrl: i.midia?.imagem_url ?? null,
      score: i.midia?.score ?? null,
    },
  };
}

/**
 * Carrega a biblioteca completa (até `limiteTotal` itens — teto defensivo;
 * a API pagina em páginas de ≤50). Retorna null se a PRIMEIRA página falhar.
 */
export async function listarTodasInteracoes(limiteTotal = 500): Promise<InteracoesPagina | null> {
  const primeiro = await getInteracoes({ limit: 50 });
  if (primeiro === null) return null;

  const items = [...primeiro.items];
  let nextCursor = primeiro.nextCursor;
  while (nextCursor && items.length < limiteTotal) {
    const pagina = await getInteracoes({ limit: 50, cursor: nextCursor });
    if (pagina === null) break; // degrada com o que já carregou
    items.push(...pagina.items);
    nextCursor = pagina.nextCursor;
  }
  return { ...primeiro, items: items.slice(0, limiteTotal) };
}
