import { api } from "@/lib/http";
import type { TipoRelacao } from "@/lib/api-relations";

/**
 * Cliente de inteligência pessoal (T201, Addendum 3 Parte 5) — consome
 * GET /api/v1/discoveries (descobertas cross-mídia) e
 * GET /api/v1/taste/history (evolução do gosto). Com graceful degradation:
 * fonte indisponível → null; sem dados → [] (empty state honesto).
 */

export interface DiscoveryMedia {
  id: string;
  titulo: string;
  tipo: string;
  imagemUrl: string | null;
  score: number | null;
}

export interface Discovery {
  fromMediaId: string;
  fromMediaType: string;
  toMediaId: string;
  toMediaType: string;
  relationType: TipoRelacao;
  discoveredAt: string;
  fromMedia: DiscoveryMedia;
  toMedia: DiscoveryMedia;
}

export interface TasteMonth {
  month: string; // "YYYY-MM"
  genreWeights: Record<string, number>;
}

function normalize(m: DiscoveryMedia): DiscoveryMedia {
  return {
    id: m.id,
    titulo: m.titulo,
    tipo: m.tipo,
    imagemUrl: m.imagemUrl ?? null,
    score: m.score ?? null,
  };
}

export async function getDiscoveries(): Promise<Discovery[] | null> {
  try {
    const data = await api.get<Discovery[]>("/api/v1/discoveries");
    return Array.isArray(data)
      ? data.map((d) => ({
          ...d,
          fromMedia: normalize(d.fromMedia),
          toMedia: normalize(d.toMedia),
        }))
      : [];
  } catch {
    return null;
  }
}

export async function getTasteHistory(): Promise<TasteMonth[] | null> {
  try {
    const data = await api.get<TasteMonth[]>("/api/v1/taste/history");
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}
