import type { ConsultaMedia, FonteAdapter, NotaColetada } from "./fonte-adapter.interface.js";
import { dominioDoTipo, estatisticas } from "./fonte-adapter.interface.js";
import { fetchJson, type ErroColeta } from "./http.utils.js";

interface TvmazeShow {
  show: {
    name?: string;
    premiered?: string | null;
    url?: string;
    rating: { average: number | null };
  };
}

function anoDoShow(show: TvmazeShow["show"]): number | null {
  const ano = show.premiered ? Number(String(show.premiered).slice(0, 4)) : NaN;
  return Number.isFinite(ano) ? ano : null;
}

/**
 * T-DADOS-46: escolhe o show da MESMA série.
 * O `search` do TVmaze casa o título e devolve séries parecidas — auditoria de
 * 60 amostras: **~7%** apontavam para outra série (ex.: `Vida` 2009 → série de
 * 2018; `Chaves` → *Clanes*; `Ben 10` 2005 → reboot de 2016). O título do
 * catálogo é traduzido, então a identidade usável é o **ano de estreia** (±1);
 * sem ano no catálogo, mantém o primeiro resultado com nota.
 */
export function escolherShowTvmaze(
  resultados: TvmazeShow[] | undefined,
  consulta: ConsultaMedia,
): TvmazeShow["show"] | null {
  const comNota = (resultados ?? [])
    .map((r) => r.show)
    .filter((s) => s && s.rating.average != null);
  if (comNota.length === 0) return null;
  if (consulta.ano == null) return comNota[0] ?? null;
  const alvo = consulta.ano;
  return (
    comNota.find((s) => {
      const ano = anoDoShow(s);
      return ano != null && Math.abs(ano - alvo) <= 1;
    }) ?? null
  );
}

/** TVMaze — sem auth, série apenas. rating.average 0–10 (audiência). */
export class TvmazeAdapter implements FonteAdapter {
  readonly id = "tvmaze";

  atendeTipo(tipo: string): boolean {
    return dominioDoTipo(tipo) === "filme_serie" && tipo === "SERIE";
  }

  ativo(): boolean {
    return true;
  }

  async coletar(consulta: ConsultaMedia): Promise<NotaColetada[]> {
    const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(consulta.titulo)}`;
    const resultados = await fetchJson<TvmazeShow[]>(url);
    const show = escolherShowTvmaze(resultados, consulta);
    const nota = show?.rating.average;
    if (!show || nota == null) return [];
    const stats = estatisticas("0-10");
    return [
      {
        fonte: this.id,
        rating: nota,
        media_fonte: stats.media,
        desvio_fonte: stats.desvio,
        // Antes a URL era o endpoint de BUSCA (JSON); o show.url é a página pública.
        url: show.url,
      },
    ];
  }
}

export type { ErroColeta };
