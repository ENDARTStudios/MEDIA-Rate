import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson } from "./http.utils.js";

interface KitsuMedia {
  data?: {
    id?: string;
    attributes?: {
      slug?: string | null;
      averageRating?: string | null;
      ratingCount?: number | null;
      startDate?: string | null;
    };
  }[];
}

function anoDoInicio(startDate: string | null | undefined): number | null {
  const ano = startDate ? Number(String(startDate).slice(0, 4)) : NaN;
  return Number.isFinite(ano) ? ano : null;
}

/**
 * T-DADOS-47: escolhe a obra da MESMA série.
 * O `filter[text]` do Kitsu casa por relevância e devolve obras parecidas —
 * auditoria de 60 amostras: **1 claramente errada** (`Suzuka` 2004 →
 * *Kimi no Iru Machi* 2008) e 2 dúbias. A identidade usável (o título do
 * catálogo é traduzido) é o **ano de início** (`startDate`) ±1; sem ano no
 * catálogo, mantém o primeiro resultado.
 */
export function escolherMangaKitsu(
  dados: KitsuMedia["data"],
  consulta: ConsultaMedia,
): NonNullable<KitsuMedia["data"]>[number] | null {
  const itens = dados ?? [];
  if (itens.length === 0) return null;
  if (consulta.ano == null) return itens[0] ?? null;
  const alvo = consulta.ano;
  return (
    itens.find((m) => {
      const ano = anoDoInicio(m.attributes?.startDate);
      return ano != null && Math.abs(ano - alvo) <= 1;
    }) ?? null
  );
}

/** Kitsu — API pública; averageRating "82.3" (0–100) → ÷10. */
export class KitsuAdapter implements FonteAdapter {
  readonly id = "kitsu";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "anime_manga";
  }

  ativo(): boolean {
    return true;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    // D-233: MANGA usa /manga; ANIME usa /anime.
    const segmento = consulta.tipo === "MANGA" ? "manga" : "anime";
    const url = `https://kitsu.io/api/edge/${segmento}?filter[text]=${encodeURIComponent(consulta.titulo)}`;
    const dados = await fetchJson<KitsuMedia>(url, {
      headers: { accept: "application/vnd.api+json" },
    });
    const media = escolherMangaKitsu(dados.data, consulta);
    const nota = media?.attributes?.averageRating;
    if (nota == null || nota === "") return [];
    const stats = estatisticas("0-100");
    const ratingCount = Number(media?.attributes?.ratingCount ?? 0);
    // T-DADOS-41: página da obra (slug real da API; id como fallback) — antes a
    // nota ficava sem URL de procedência.
    const chave = media?.attributes?.slug || media?.id;
    return [
      {
        fonte: this.id,
        rating: Number.parseFloat(nota),
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        votos: ratingCount > 0 ? ratingCount : undefined,
        url: chave ? `https://kitsu.io/${segmento}/${chave}` : undefined,
      },
    ];
  }
}
