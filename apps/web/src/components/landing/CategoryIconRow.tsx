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

/**
 * Constelação das 6 categorias do hero (T415 → redesenho de apresentação).
 *
 * - Os 6 pares ícone+cor são CANÔNICOS (`CATEGORY_TOKENS`, AA garantido por
 *   `test/contrast-aa.spec.ts`) — este componente só os posiciona e anima.
 * - Estrutura: anel orbital decorativo + `hub` com o wordmark do score + 6
 *   tiles que NAVEGAM para `/catalog?type=X` (T415/D-390).
 * - Movimento em 3 camadas via CSS module (entrada em cascata, flutuação +
 *   brilho ambiente, anel girando). Nenhuma lib de animação: o JS aqui só faz
 *   o tilt de ponteiro (±6°, desktop com ponteiro fino) e não bloqueia o LCP.
 * - `prefers-reduced-motion`: tudo parado, 6 tiles visíveis (o bloco de
 *   reduced-motion vive no CSS module).
 * - Contrato e orçamento de movimento:
 *   `.agents/skills/media-rate-ui-ux/references/hero-playbook.md`.
 */
export function CategoryIconRow() {
  const t = useTranslations("catalog");
  const tHero = useTranslations("hero");
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

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
  }, []);

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
            {ORDER.map((type, index) => {
              const token = CATEGORY_TOKENS[type];
              const Icon = token.icon;
              const label = t(token.labelKey.replace(/^catalog\./, ""));
              return (
                <li
                  key={type}
                  className={styles.item}
                  style={
                    {
                      "--a": `${START_ANGLE + index * STEP_ANGLE}deg`,
                    } as React.CSSProperties
                  }
                >
                  <Link
                    href={`/catalog?type=${type}`}
                    aria-label={label}
                    data-category-tile={type}
                    className={styles.tileLink}
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
                          className="h-10 w-10 lg:h-11 lg:w-11"
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
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
