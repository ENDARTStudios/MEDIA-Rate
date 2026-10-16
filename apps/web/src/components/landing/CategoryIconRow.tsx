"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";
import styles from "./category-orbit.module.css";

// T394: 6 tipos ativos (mangá separado de HQs).
const ORDER: MediaType[] = ["movie", "series", "game", "book", "comic", "manga"];

/** Primeiro tile no topo do anel; os demais a cada 60°. */
const START_ANGLE = -90;
const STEP_ANGLE = 60;

/** Efeito Dock (D-644): alcance em casas e escala máxima da peça sob o ponteiro. */
const DOCK_ALCANCE = 2.2;
const DOCK_MAX = 1.32;

/**
 * Os 6 tipos canônicos — em duas formas (D-644).
 *
 * - `variant="orbit"` (padrão): a constelação do hero — anel orbital decorativo + hub com o
 *   wordmark + 6 tiles em movimento de 3 camadas + tilt de ponteiro. É a forma original (T415).
 * - `variant="row"`: a **fileira centralizada**, com o símbolo grande (62px) e o **efeito Dock** —
 *   a peça sob o ponteiro cresce 32%, as vizinhas crescem menos e a fileira sobe, em queda em
 *   cosseno ao quadrado por distância. É a forma pedida pelo Operador ("os ícones são primários,
 *   centralize-os" + "como a barra de tarefas do Mac").
 *
 * O que **não** muda entre as duas: os 6 pares ícone+cor canônicos (`CATEGORY_TOKENS`, AA garantido
 * por `test/contrast-aa.spec.ts`), o destino (`/catalog?type=X`), o `aria-label` por tipo, o
 * `data-testid`, o `strokeWidth 1.6` do glifo e o respeito a `prefers-reduced-motion`.
 *
 * Contrato e orçamento de movimento:
 * `.agents/skills/media-rate-ui-ux/references/hero-playbook.md`.
 */
export function CategoryIconRow({ variant = "orbit" }: { variant?: "orbit" | "row" } = {}) {
  const t = useTranslations("catalog");
  const tHero = useTranslations("hero");
  const stageRef = useRef<HTMLDivElement>(null);

  // Tilt de ponteiro da constelação (±6°) — só na forma orbital.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || variant !== "orbit") return;

    // Só no desktop com ponteiro fino, e nunca com reduced-motion.
    const query = window.matchMedia(
      "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    if (!query.matches) return;

    let frame = 0;
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));

    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = stage.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const nx = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2));
        const ny = clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2));
        stage.style.setProperty("--tx", `${(nx * 6).toFixed(2)}deg`);
        stage.style.setProperty("--ty", `${(-ny * 6).toFixed(2)}deg`);
      });
    };

    const reset = () => {
      stage.style.setProperty("--tx", "0deg");
      stage.style.setProperty("--ty", "0deg");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", reset);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", reset);
    };
  }, [variant]);

  /**
   * D-644 — efeito Dock. CSS decide, o JS só escreve números: `pointermove` na fileira, dentro de
   * `requestAnimationFrame`, gravando `--s` (escala) e `--up` (altura) por peça. Zero estado do
   * React por frame, o mesmo padrão do tilt acima. Só com ponteiro fino, a partir de 1024px, e
   * nunca com reduced-motion (no CSS).
   */
  useEffect(() => {
    const row = stageRef.current;
    if (!row || variant !== "row") return;

    const query = window.matchMedia(
      "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    if (!query.matches) return;

    const tiles = Array.from(row.querySelectorAll<HTMLElement>("[data-dock]"));
    if (tiles.length === 0) return;

    let frame = 0;

    const aplicar = (clientX: number) => {
      frame = 0;
      const centros = tiles.map((el) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
      });
      // Índice mais próximo do ponteiro — em casas, não em pixels: a queda é por distância de peça.
      let ponteiro = 0;
      let menor = Infinity;
      centros.forEach((cx, i) => {
        const d = Math.abs(clientX - cx);
        if (d < menor) {
          menor = d;
          ponteiro = i;
        }
      });
      tiles.forEach((el, i) => {
        const d = Math.min(Math.abs(i - ponteiro) / DOCK_ALCANCE, 1);
        const queda = Math.cos((d * Math.PI) / 2) ** 2;
        el.style.setProperty("--s", (1 + (DOCK_MAX - 1) * queda).toFixed(3));
        el.style.setProperty("--up", (queda * 10).toFixed(1));
      });
    };

    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => aplicar(event.clientX));
    };

    const reset = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      tiles.forEach((el) => {
        el.style.removeProperty("--s");
        el.style.removeProperty("--up");
      });
    };

    row.addEventListener("pointermove", onMove, { passive: true });
    row.addEventListener("pointerleave", reset);
    row.addEventListener("focusin", reset);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      row.removeEventListener("pointermove", onMove);
      row.removeEventListener("pointerleave", reset);
      row.removeEventListener("focusin", reset);
    };
  }, [variant]);

  /** O tile é o mesmo nas duas formas: só o wrapper muda. */
  const tiles = ORDER.map((type, index) => {
    const token = CATEGORY_TOKENS[type];
    const Icon = token.icon;
    const label = t(token.labelKey.replace(/^catalog\./, ""));
    const naFileira = variant === "row";
    return (
      <li
        key={type}
        className={naFileira ? styles.rowItem : styles.item}
        style={
          naFileira
            ? ({ "--c": token.color } as React.CSSProperties)
            : ({ "--a": `${START_ANGLE + index * STEP_ANGLE}deg` } as React.CSSProperties)
        }
        {...(naFileira ? { "data-dock": "" } : {})}
      >
        <Link
          href={`/catalog?type=${type}`}
          aria-label={label}
          data-category-tile={type}
          className={naFileira ? styles.rowTileLink : styles.tileLink}
          style={
            {
              "--i": index,
              "--c": token.color,
            } as React.CSSProperties
          }
        >
          <span className={styles.iconBox}>
            <span className={styles.iconGlow} aria-hidden="true" />
            <span className={styles.iconFloat}>
              <Icon
                className={
                  naFileira
                    ? "h-[62px] w-[62px] motion-reduce:h-11 motion-reduce:w-11"
                    : "h-10 w-10 lg:h-11 lg:w-11"
                }
                strokeWidth={1.6}
                color={token.color}
                aria-hidden="true"
              />
            </span>
          </span>
          <span className={styles.label}>{label}</span>
        </Link>
      </li>
    );
  });

  if (variant === "row") {
    return (
      <nav aria-label={t("catalogAria")} data-testid="category-icon-row" data-variant="row">
        <div ref={stageRef} className={styles.rowStage}>
          <ul className={styles.rowList} role="list">
            {tiles}
          </ul>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label={t("catalogAria")} data-testid="category-icon-row">
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.tilt}>
          {/* Camada de ambiente — decorativa. O arco do cometa é filho do anel
              de propósito: o mask precisa da caixa do ANEL, não do stage. */}
          <div className={styles.ring} aria-hidden="true">
            <div className={styles.ringArc} />
          </div>
          <div className={styles.ringPulse} aria-hidden="true" />
          <div className={styles.spokes} aria-hidden="true">
            {ORDER.map((type, index) => (
              <span
                key={type}
                className={styles.spoke}
                style={
                  {
                    "--a": `${START_ANGLE + index * STEP_ANGLE}deg`,
                    "--c": CATEGORY_TOKENS[type].color,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div className={styles.hub} aria-hidden="true">
            <span className={styles.hubWord}>{tHero("mediaScore")}</span>
          </div>

          <ul className={styles.list} role="list">
            {tiles}
          </ul>
        </div>
      </div>
    </nav>
  );
}
