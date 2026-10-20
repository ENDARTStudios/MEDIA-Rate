"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotionPref } from "@/lib/useReducedMotionPref";

/**
 * AutoScrollTrack — o auto-avanço dos carrosséis do conceito v9 §4.
 *
 * Por que existe: o carrossel do produto é scroll-snap manual, que é o comportamento
 * mais seguro. O conceito pede **um card a cada 5 s**, com as travas que a WCAG 2.2.2
 * exige — e é isso que esta ilha faz, sem tirar o scroll manual:
 *
 * - **pausa** em hover e em focus (quem está lendo não é interrompido);
 * - **desliga** em `prefers-reduced-motion: reduce` (não cria movimento novo);
 * - **pausa** quando a aba está oculta (`visibilitychange`) — timer em aba oculta é
 *   desperdício e faz o carrossel pular quando a pessoa volta;
 * - **para de vez** quando a pessoa toca/rola a trilha: insistir depois de uma
 *   interação explícita é o que irrita;
 * - ao chegar no fim, **volta ao início** (senão o auto-avanço morre na primeira volta).
 *
 * O passo é medido do próprio card (largura + gap), não chutado: card de 180 px com
 * gap de 16 px não é 180 px de deslocamento.
 */

const PASSO_MS = 5000;

export function AutoScrollTrack({
  children,
  rotulo,
  className,
  id,
  passoMs = PASSO_MS,
}: {
  children: ReactNode;
  /** Nome acessível da trilha (o mesmo do carrossel). */
  rotulo: string;
  className?: string;
  /** O `CarouselControls` acha a trilha por id — sem ele, as setas param de funcionar. */
  id?: string;
  passoMs?: number;
}) {
  const trilha = useRef<HTMLDivElement>(null);
  const reduzir = useReducedMotionPref();
  const pausado = useRef(false);
  const parouPorInteracao = useRef(false);

  useEffect(() => {
    const el = trilha.current;
    if (!el) return;
    // O atributo é escrito AQUI, não no JSX: `useReducedMotionPref()` devolve false no
    // servidor e true no cliente sob `reduce`, e ler isso durante o render produzia
    // hydration mismatch de atributo (pego pelo gate D-587 na home).
    el.dataset.autoscroll = reduzir ? "off" : "on";
    if (reduzir) return; // sem movimento automático para quem pediu menos movimento

    const avancar = () => {
      if (pausado.current || parouPorInteracao.current) return;
      if (document.visibilityState === "hidden") return;
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const estilo = getComputedStyle(el);
      const gap = Number.parseFloat(estilo.columnGap || estilo.gap || "0") || 0;
      const passo = card.offsetWidth + gap;
      const noFim = el.scrollLeft + el.clientWidth >= el.scrollWidth - passo / 2;
      el.scrollTo({ left: noFim ? 0 : el.scrollLeft + passo, behavior: "smooth" });
    };

    const pausar = () => {
      pausado.current = true;
    };
    const retomar = () => {
      pausado.current = false;
    };
    const parar = () => {
      parouPorInteracao.current = true;
    };

    const timer = window.setInterval(avancar, passoMs);

    el.addEventListener("pointerenter", pausar);
    el.addEventListener("pointerleave", retomar);
    el.addEventListener("focusin", pausar);
    el.addEventListener("focusout", retomar);
    el.addEventListener("pointerdown", parar);
    el.addEventListener("wheel", parar, { passive: true });
    el.addEventListener("touchstart", parar, { passive: true });
    document.addEventListener("visibilitychange", retomar);

    return () => {
      window.clearInterval(timer);
      el.removeEventListener("pointerenter", pausar);
      el.removeEventListener("pointerleave", retomar);
      el.removeEventListener("focusin", pausar);
      el.removeEventListener("focusout", retomar);
      el.removeEventListener("pointerdown", parar);
      el.removeEventListener("wheel", parar);
      el.removeEventListener("touchstart", parar);
      document.removeEventListener("visibilitychange", retomar);
    };
  }, [reduzir, passoMs]);

  return (
    <div
      ref={trilha}
      id={id}
      role="group"
      aria-roledescription="carrossel"
      aria-label={rotulo}
      /* Valor constante no SSR; o efeito troca para "off" quando há reduce. */
      data-autoscroll="on"
      className={className}
    >
      {children}
    </div>
  );
}
