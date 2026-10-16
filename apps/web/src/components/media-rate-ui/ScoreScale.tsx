import { scoreColor } from "@/lib/design-tokens";

/**
 * D-642 — a régua: a escala do MEDIA Score como objeto visível (conceito v10).
 *
 * **Por que existe:** a cor de faixa aparecia espalhada (ficha, ranking, cartão), mas o usuário
 * nunca via a **escala inteira** num lugar só — tinha de deduzir que 8 é melhor que 7. A régua
 * mostra as seis faixas de uma vez, com a cor canônica e o nome de cada uma, dentro da faixa de
 * prova do hero (que já é a seção do *método*): a régua é a visualização desse método.
 *
 * **Server component de propósito** (T211/T405): recebe os rótulos por prop, como o `HeroSection`
 * já faz. Nada de `useTranslations` aqui — assim ela hidrata zero JS e pode ser usada em qualquer
 * server component. A cor sai de `scoreColor()` (D-582.4a): uma só fonte para as 6 faixas.
 *
 * **Sincronia com o selo (próximo passo):** cada faixa expõe `data-band`. O ciclo do `ScoreDial`
 * escreve `data-faixa` no container ancestral e a faixa ativa se acende por CSS — o realce não
 * custa re-render e a régua continua servidor.
 */

/** As seis faixas, na ordem dos tokens (`colors.score`) — a mesma de `scoreColor()`. */
const FAIXAS = [
  { key: "9", faixa: "9–10", valor: 9.5 },
  { key: "8", faixa: "8", valor: 8 },
  { key: "7", faixa: "7", valor: 7 },
  { key: "6", faixa: "6", valor: 6 },
  { key: "5", faixa: "5", valor: 5 },
  { key: "low", faixa: "< 5", valor: 0 },
] as const;

export type ScoreScaleLabels = Record<(typeof FAIXAS)[number]["key"], string>;

export function ScoreScale({
  labels,
  className = "",
}: {
  /** Nome de cada faixa, já traduzido (`scoredial.bands`). */
  labels: ScoreScaleLabels;
  className?: string;
}) {
  return (
    <ul
      data-score-scale=""
      role="list"
      className={`grid grid-cols-3 gap-x-4 gap-y-4 sm:grid-cols-6 ${className}`}
    >
      {FAIXAS.map((f) => (
        <li key={f.key} data-band={f.key} className="flex flex-col gap-1.5 text-left">
          {/* D-643: `data-bar`/`data-range` são os ganchos que o ciclo do selo acende por CSS
              (`score-showcase.module.css`) — a régua não precisa saber qual faixa está ativa. */}
          <span
            data-bar=""
            className="block h-1.5 rounded-full"
            style={{ backgroundColor: scoreColor(f.valor) }}
            aria-hidden="true"
          />
          <span
            data-range=""
            className="font-heading text-sm font-bold"
            style={{ color: scoreColor(f.valor) }}
          >
            {f.faixa}
          </span>
          <span className="text-[11px] leading-tight text-[#85859F]">{labels[f.key]}</span>
        </li>
      ))}
    </ul>
  );
}
