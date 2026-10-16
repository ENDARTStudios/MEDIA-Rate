import { Link } from "@/lib/navigation";
import { colors } from "@/lib/design-tokens";
import type { ScoreBandKey } from "./media-rate-ui/score-dial-core";

export interface DecisionItem {
  titulo: string;
  tipo: string;
}

export interface DecisionBlock {
  /** Chave da faixa (`scoredial.bands`) — a cor sai dela, nunca de um literal. */
  faixa: ScoreBandKey;
  faixaLabel: string;
  titulo: string;
  descricao: string;
  itens: DecisionItem[];
}

/** Cor canônica de uma faixa, pela mesma tabela que o resto do produto usa. */
function corDaFaixa(faixa: ScoreBandKey): string {
  return faixa === "low" ? colors.score.low : colors.score[Number(faixa) as 5 | 6 | 7 | 8 | 9];
}

/**
 * D-646 — "Por decisão, não por prateleira" (conceito v10).
 *
 * A ideia que o Operador aprovou: em vez de prateleiras por gênero, blocos que respondem à pergunta
 * que a pessoa tem na cabeça — e cada bloco mostra a **faixa** (cor + rótulo), não uma promessa.
 *
 * Server component: recebe tudo por prop (o `page.tsx` já tem os itens do catálogo) e hidrata zero
 * JS. Os itens são **reais**, filtrados pela faixa na página; sem item, o bloco não é renderizado —
 * nada de caixa vazia nem de título inventado (D-583.4).
 *
 * O fecho, "Sem nota de marketing", é a afirmação que sustenta a seção: nenhum número aqui é fixo
 * no código.
 */
export function DecisionHighlights({
  title,
  sub,
  blocks,
  ctaLabel,
  notaTitulo,
  notaTexto,
  stepsTitle,
  steps,
  className = "",
}: {
  title: string;
  sub: string;
  blocks: DecisionBlock[];
  ctaLabel: string;
  notaTitulo: string;
  /** Título de "Como o score nasce". */
  stepsTitle?: string;
  /** Os passos do método (3), na ordem. */
  steps?: { n: string; titulo: string; descricao: string }[];
  notaTexto: string;
  className?: string;
}) {
  const visiveis = blocks.filter((b) => b.itens.length > 0);

  return (
    <section className={className} aria-labelledby="decision-title">
      {visiveis.length > 0 && (
        <>
          <h2
            id="decision-title"
            className="font-heading text-2xl font-bold text-[#F5F5F7] sm:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-[#A0A0B8] sm:text-base">
            {sub}
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visiveis.map((b) => {
              const cor = corDaFaixa(b.faixa);
              return (
                <article
                  key={b.faixa}
                  data-decision-block={b.faixa}
                  className="flex min-w-0 flex-col rounded-xl border border-[#2A2A3D] bg-[#12121C] p-6"
                >
                  <span
                    className="w-fit rounded-lg border px-3 py-1 text-xs font-bold"
                    style={{ borderColor: cor, color: cor }}
                  >
                    {b.faixaLabel}
                  </span>
                  <h3 className="mt-4 font-heading text-xl font-bold text-[#F5F5F7]">{b.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#A0A0B8]">{b.descricao}</p>

                  <ul className="mt-5 flex flex-col gap-2">
                    {b.itens.map((it) => (
                      <li
                        key={`${b.faixa}-${it.titulo}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-[#1B1B2C] px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm text-[#F5F5F7]">{it.titulo}</span>
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[#85859F]">
                          {it.tipo}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/catalog"
                    className="mt-5 text-sm font-medium text-[#818CF8] transition-colors hover:text-[#F5F5F7]"
                  >
                    {ctaLabel}
                  </Link>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Como o score nasce — o método em três passos. Sempre visível: é explicação, não dado. */}
      {stepsTitle && steps && steps.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] sm:text-3xl">
            {stepsTitle}
          </h2>
          <ol className="mt-6 grid gap-5 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="flex flex-col gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1B1B2C] text-sm font-bold text-[#818CF8]">
                  {s.n}
                </span>
                <h3 className="font-heading text-base font-bold text-[#F5F5F7]">{s.titulo}</h3>
                <p className="text-sm leading-relaxed text-[#A0A0B8]">{s.descricao}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Fecho: a afirmação que sustenta a seção — vale com ou sem catálogo. */}
      <div className="mt-10 rounded-xl border border-[#2A2A3D] bg-[#12121C] px-6 py-7 sm:px-8">
        <h3 className="font-heading text-xl font-bold text-[#F5F5F7]">{notaTitulo}</h3>
        <p className="mt-2 max-w-[80ch] text-sm leading-relaxed text-[#A0A0B8]">{notaTexto}</p>
      </div>
    </section>
  );
}
