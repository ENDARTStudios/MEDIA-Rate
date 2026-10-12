"use client";

import { useCallback, useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";
import { useLocale } from "next-intl";
import { useReducedMotionPref } from "@/lib/useReducedMotionPref";

interface CountUpValueProps {
  /** Valor final do contador (nunca uma string já formatada). */
  value: number;
  className?: string;
  /** Duração aproximada em segundos (default 1.6). */
  duration?: number;
}

/**
 * Contador animado LOCALE-AWARE e SSR-safe para números de destaque (prova social).
 *
 * Origem do padrão: React Bits `CountUp` (MIT + Commons Clause, DavidHDev) —
 * registry `@react-bits` configurado em `apps/web/components.json`. Reimplementado
 * aqui porque o original não atende três regras deste repo:
 *  1. `Intl.NumberFormat("en-US")` fixo — quebraria pt-BR/es-ES (paridade i18n);
 *  2. nenhum tratamento de `prefers-reduced-motion` (obrigatório no projeto);
 *  3. renderiza `<span>` VAZIO e só preenche no efeito — sem JS (ou no SSR) o
 *     número desaparece. Aqui o HTML do servidor já sai com o valor final,
 *     então LCP/SEO/leitores de tela nunca veem um número vazio.
 *
 * Atribuição: `.zcode/skills/THIRD-PARTY.md`.
 */
export function CountUpValue({ value, className, duration = 1.6 }: CountUpValueProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const locale = useLocale();
  const shouldReduce = useReducedMotionPref();

  const motionValue = useMotionValue(0);
  // Mola calibrada para ~1,6 s sem "bounce" (motion-design: sem overshoot em número).
  const springValue = useSpring(motionValue, {
    damping: 22 + 24 * (1 / duration),
    stiffness: 90 * (1 / duration),
    restDelta: 0.4,
  });
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });

  const format = useCallback(
    (latest: number) => new Intl.NumberFormat(locale).format(Math.round(latest)),
    [locale],
  );

  // Só anima quando o bloco entra em viewport e o usuário aceita movimento.
  useEffect(() => {
    if (shouldReduce || !inView) return;
    motionValue.set(value);
  }, [shouldReduce, inView, motionValue, value]);

  useEffect(() => {
    if (shouldReduce) return;
    return springValue.on("change", (latest: number) => {
      if (ref.current) ref.current.textContent = format(latest);
    });
  }, [springValue, format, shouldReduce]);

  // Texto do servidor = valor final (sem flash de "0" e sem quebra sem-JS).
  return (
    <span ref={ref} className={className} data-countup={value}>
      {format(value)}
    </span>
  );
}
