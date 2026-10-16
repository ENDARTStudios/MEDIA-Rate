"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { bandKey } from "./score-dial-core";
import { useReducedMotionPref } from "@/lib/useReducedMotionPref";
import { ScoreDial } from "./ScoreDial";
import styles from "./score-showcase.module.css";

export interface ScoreShowcaseItem {
  /** Título real, vindo do catálogo. */
  titulo: string;
  /** Nota real (0–10 ou 0–100, conforme `scale`). */
  score: number;
  /** Rótulo do tipo de mídia, já traduzido. */
  tipo: string;
}

/**
 * D-643 — o selo percorre a escala, sincronizado com a régua (conceito v10).
 *
 * **Honestidade antes de estética:** o ciclo não inventa notas nem anima números "para parecer
 * movimento". Ele recebe **obras reais** (o topo de cada tipo, que a home já busca para os
 * carrosséis) e troca de obra; o valor exibido é sempre o que veio do cálculo (D-583.4).
 *
 * **Reuso, não reimplementação:** o anel é o `ScoreDial` (client) — mesma geometria, mesmo i18n de
 * `ariaLabel`, mesmo tratamento de locale e de reduced-motion. Escrever um anel aqui seria a
 * duplicação que o D-582.4a/D-621 já custaram caro uma vez.
 *
 * **Sincronia por atributo, não por estado compartilhado:** a cada troca o wrapper recebe
 * `data-faixa` com a chave da faixa (derivada de `scoreColor`, sem repetir limiares). A régua —
 * que continua SERVER component, recebida como `children` — reage por CSS e não vira cliente.
 *
 * **Custo:** um `setInterval` que só corre com a seção visível, pausa em hover/focus e **não
 * existe** em `prefers-reduced-motion` (fica no primeiro item, com a régua ainda legível).
 */
export function ScoreShowcase({
  items,
  label,
  scale = "0-10",
  children,
  className = "",
}: {
  items: ScoreShowcaseItem[];
  /** Rótulo do bloco (ex.: "a régua em movimento"). */
  label: string;
  scale?: "0-10" | "0-100";
  /** A régua, renderizada no servidor. */
  children?: ReactNode;
  className?: string;
}) {
  const semMovimento = useReducedMotionPref();
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const visivelRef = useRef(true);

  const total = items.length;
  const item = items[indice] ?? items[0];
  const faixa = item ? bandKey(item.score, scale) : "low";

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entradas) => {
        visivelRef.current = entradas.some((e) => e.isIntersecting);
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (semMovimento || pausado || total <= 1) return;
    const id = window.setInterval(() => {
      if (visivelRef.current) setIndice((i) => (i + 1) % total);
    }, 2600);
    return () => window.clearInterval(id);
  }, [semMovimento, pausado, total]);

  useEffect(() => {
    wrapRef.current?.setAttribute("data-faixa", faixa);
  }, [faixa]);

  if (!item) return null;

  return (
    <div
      ref={wrapRef}
      data-faixa={faixa}
      className={`${styles.wrap} ${className}`}
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div className="flex items-center gap-4">
        <ScoreDial value={item.score} scale={scale} size="md" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#85859F]">
            {item.tipo}
          </p>
          <p className="truncate font-heading text-sm font-semibold text-[#F5F5F7]">
            {item.titulo}
          </p>
          <p className="mt-0.5 text-[11px] text-[#85859F]">{label}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
