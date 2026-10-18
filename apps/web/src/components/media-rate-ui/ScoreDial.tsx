"use client";

/**
 * ScoreDial (Parte 4 da D-203) — dial de score escala-aware.
 *
 * - Escala via prop ("0-10" | "0-100") — nunca hardcoded.
 * - Cor por faixa relativa à escala: alto #34D399 (≥8/≥80),
 *   médio #FBBF24 (≥6/≥60), baixo #F87171 (<6/<60).
 * - Número em JetBrains Mono (--font-mono) com tabular-nums.
 * - aria-label com valor + escala (ex.: "Nota 8.4 de 10").
 * - showConfidence: exibe rótulo textual da faixa.
 * - Sem animação (F7) — estrutura pronta para prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useReducedMotionPref } from "@/lib/useReducedMotionPref";
import { formatarScoreLocale } from "@/lib/score-utils";
import { SCORE_DIAL_TRACK, dialGeometry, scoreBand } from "./score-dial-core";

export interface ScoreDialProps {
  value: number;
  scale?: "0-10" | "0-100";
  size?: "sm" | "md" | "lg";
  showConfidence?: boolean;
  className?: string;
  /**
   * T210: ver `StaticScoreDial` — disco escuro atrás do anel quando o dial é
   * sobreposto a pôster (contraste por pixel). Default `false` para não alterar
   * os usos sobre superfície sólida.
   */
  onArtwork?: boolean;
}

/**
 * D-582.4a (T211): a função de faixa era LOCAL e divergia do resto do produto
 * (3 faixas ≥8/≥6/<6) enquanto `scoreColor()` em `design-tokens.ts` tem 6 faixas
 * (9/8/7/6/5/low). Resultado: o MESMO score saía com cor diferente no card
 * (ScoreDial) e no módulo de score. Agora há uma única fonte de verdade.
 */

export function ScoreDial({
  value,
  scale = "0-10",
  size = "md",
  showConfidence = false,
  className,
  onArtwork = false,
}: ScoreDialProps) {
  // D-621: geometria e faixa vêm do núcleo compartilhado com o `StaticScoreDial`
  // (o `label` de 3 níveis continua sendo calculado aqui, a partir da mesma faixa).
  const { cfg, max, clamped, circ, offset, color } = dialGeometry(value, scale, size);
  const { label } = scoreBand(clamped, scale);
  const shouldReduce = useReducedMotionPref();
  const locale = useLocale();
  // T147: aria i18n (scoredial.ariaLabel) com valor FORMATADO — nunca pt-BR
  // hardcode e nunca valor arredondado (7,9 permanece 7,9).
  const tScore = useTranslations("scoredial");
  const ariaLabel = tScore("ariaLabel", {
    score: formatarScoreLocale(clamped, locale),
    max: String(max),
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(clamped);

  // Contador 0 → valor quando entra no viewport (Anime.js lazy) — Part 5.
  // prefers-reduced-motion: valor final direto, sem animação.
  useEffect(() => {
    if (shouldReduce) {
      setDisplay(clamped);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setDisplay(clamped);
      return;
    }
    let cancel = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || cancel) return;
        observer.disconnect();
        void (async () => {
          const { animate } = await import("animejs/animation");
          if (cancel) return;
          const target = { v: 0 };
          animate(target, {
            v: clamped,
            duration: 800,
            ease: "outQuad",
            onUpdate: () => {
              // T147/B3: sem Math.round — o frame final (target.v === clamped)
              // exibe o mesmo valor truncado do reduced-motion; a formatação
              // (1 casa, locale) acontece na renderização.
              if (!cancel) setDisplay(target.v);
            },
          });
        })();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      cancel = true;
      observer.disconnect();
    };
  }, [clamped, shouldReduce]);

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      role="img"
      aria-label={ariaLabel}
      data-testid={`score-dial-${size}`}
    >
      {onArtwork && (
        // T210: fundo do badge (atrás do anel) — ver `StaticScoreDial`.
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-surface-bg/85" />
      )}
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
          {formatarScoreLocale(display, locale)}
        </span>
        {showConfidence && (
          <span className="mt-0.5 text-xs uppercase tracking-wider" style={{ color }}>
            {label === "high" ? "Alta" : label === "medium" ? "Média" : "Baixa"}
          </span>
        )}
      </div>
    </div>
  );
}
