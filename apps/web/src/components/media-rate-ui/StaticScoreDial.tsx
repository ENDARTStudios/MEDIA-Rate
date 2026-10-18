/**
 * StaticScoreDial (T405/D-380) — dial de score escala-aware SEM hidratação.
 *
 * Espelho visual do ScoreDial (client), mas puro JSX/SVG renderizado no
 * servidor: sem contador animejs, sem IntersectionObserver. Usado pelo
 * MediaCardShell para que os 60 cards dos carrosséis não hidratem JS de
 * animação (o gargalo de TTI/LCP da home).
 *
 * - Escala via prop ("0-10" | "0-100"); cor por faixa relativa à escala.
 * - aria-label com valor + escala; data-testid idêntico ao ScoreDial (md).
 */
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatarScoreLocale } from "@/lib/score-utils";
import {
  SCORE_DIAL_TRACK,
  dialGeometry,
  type ScoreDialScale,
  type ScoreDialSize,
} from "./score-dial-core";

export interface StaticScoreDialProps {
  value: number;
  scale?: ScoreDialScale;
  size?: ScoreDialSize;
  className?: string;
  /**
   * T210: o dial é desenhado só com anel + número (centro transparente). Sobre
   * PÔSTER o número cai no pixel da capa e o contraste real despenca (o detector
   * de DOM mediu 1,1:1–1,7:1 nos carrosséis). Com `onArtwork`, um disco escuro
   * entra atrás do anel e garante leitura em qualquer arte — sem afetar os usos
   * sobre superfície sólida (ficha, dashboard).
   */
  onArtwork?: boolean;
}

export function StaticScoreDial({
  value,
  scale = "0-10",
  size = "md",
  className,
  onArtwork = false,
}: StaticScoreDialProps) {
  const { cfg, max, clamped, circ, offset, color } = dialGeometry(value, scale, size);
  // T147: mesmo pipeline do ScoreDial client — aria i18n e número por locale.
  const tScore = useTranslations("scoredial");
  const locale = useLocale();

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      role="img"
      aria-label={tScore("ariaLabel", {
        score: formatarScoreLocale(clamped, locale),
        max: String(max),
      })}
      data-testid={`score-dial-${size}`}
    >
      {onArtwork && (
        // Fundo do badge (atrás do anel): 85% de #05050A garante ≥ 4.5:1 para o
        // número mesmo sobre capa branca. Pinta antes do SVG → anel visível.
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-surface-bg/85" />
      )}
      {/* D-650: o viewBox era 60x60, mas os raios de SCORE_DIAL_SIZE chegam a 38 (lg) e o
            traço a 6 — 44 > 30 (metade do viewBox), então o círculo era CORTADO e sobravam
            as quatro pontas (era isso que aparecia como "cantoneiras" no selo do hero).
            100x100 é o mesmo do ScoreDial, que é o espelho deste componente. */}
      <svg className={cn(cfg.ring, "-rotate-90")} viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={cfg.radius}
          fill="none"
          stroke={SCORE_DIAL_TRACK}
          strokeWidth={cfg.stroke}
        />
        <circle
          cx="50"
          cy="50"
          r={cfg.radius}
          fill="none"
          stroke={color}
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn("font-mono font-bold tabular-nums", cfg.number)} style={{ color }}>
          {formatarScoreLocale(clamped, locale)}
        </span>
      </div>
    </div>
  );
}
