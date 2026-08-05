"use client";

/**
 * Hero Media Icon v4 — renders 3D pré-renderizados (T5a-hero-3d-fix-v4).
 *
 * DECISOES.md D-014: nada de SVG codado à mão no Hero. Cada categoria é um
 * render claymorphism/glossy estático (public/assets/hero/*.webp) com:
 * - Idle contínuo: float translateY [0,-8,0] 3.6s + glow respirando em
 *   sincronia (delay escalonado por índice × 250ms) — página viva sem hover.
 * - One-shot por hover/focus com TRANSFORMS 3D reais (Anime.js):
 *   Filmes: clap rotateX [-28,6,-2,0] na base + flash branco no impacto
 *   Séries: CRT on scaleY [1,0.06,1.08,1] + scaleX [1,1.25,0.97,1] +
 *           scanline HTML + brightness pulse
 *   Games:  combo rotateZ [0,-7,6,-5,4,0] + jolts + 4 sparks HTML
 *   Livros: folhear rotateY [22,-16,6,0] na lombada + 3 páginas HTML
 *   HQ:     POW scale [1,1.14,0.96,1] + rotateZ + 8 dots + starburst
 * - mask-image radial-gradient dissolve as bordas do render no fundo do hero.
 * - Tilt Motion (springs 150/15, perspective 1000px) gateado por
 *   (hover:hover) and (pointer:fine).
 * - prefers-reduced-motion: idle e one-shots desligados (render puro).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { animate, random, stagger } from "animejs";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import styles from "./hero-icons.module.css";
import type { MediaType } from "@/lib/types";

export type AnimationVariant = "clapperboard" | "tv" | "controller" | "book" | "magazine";

export interface HeroMediaIconProps {
  type: MediaType;
  variant: AnimationVariant;
  href: string;
  label: string;
  /** Índice no cluster (0-4) — escalona o idle float e marca priority no LCP. */
  index?: number;
  className?: string;
}

const ASSETS: Record<AnimationVariant, string> = {
  clapperboard: "/assets/hero/film.webp",
  tv: "/assets/hero/serie.webp",
  controller: "/assets/hero/game.webp",
  book: "/assets/hero/livro.webp",
  magazine: "/assets/hero/hq.webp",
};

const ACCENTS: Record<AnimationVariant, string> = {
  clapperboard: "#818CF8",
  tv: "#38BDF8",
  controller: "#34D399",
  book: "#FBBF24",
  magazine: "#F472B6",
};

const TOUCH_NAV_DELAY_MS = 700;

/** Explosão de partículas físicas (trajetória aleatória) sobre o render. */
function particleBurst(
  fx: HTMLElement,
  anims: ReturnType<typeof animate>[],
  opts: {
    count?: number;
    colors: string[];
    distance?: number;
    size?: number;
    round?: boolean;
    delay?: number;
  },
) {
  const { count = 12, colors, distance = 80, size = 8, round = true, delay = 0 } = opts;
  const els = Array.from({ length: count }, (_, i) => {
    const el = document.createElement("span");
    el.style.cssText = `position:absolute;left:50%;top:50%;opacity:0;pointer-events:none;
      width:${size}px;height:${round ? size : size / 3}px;background:${colors[i % colors.length]};
      border-radius:${round ? "50%" : "2px"};margin-left:${-size / 2}px;margin-top:${-size / 2}px;`;
    fx.appendChild(el);
    return el;
  });
  anims.push(
    animate(els, {
      translateX: () => random(-distance, distance),
      translateY: () => random(-distance, distance),
      scale: [0, () => random(12, 20) / 10],
      opacity: [1, 0],
      rotate: () => random(-160, 160),
      duration: 700,
      delay: stagger(25, { start: delay }),
      ease: "outCubic",
      complete: () => els.forEach((el) => el.remove()),
    }),
  );
}

export function HeroMediaIcon({
  type,
  variant,
  href,
  label,
  index = 0,
  className,
}: HeroMediaIconProps) {
  const router = useRouter();
  const locale = useLocale();
  const shouldReduce = useReducedMotion();
  const rootRef = useRef<HTMLAnchorElement>(null);
  const shotRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<ReturnType<typeof animate>[]>([]);
  const [finePointer, setFinePointer] = useState(false);
  const src = ASSETS[variant];
  const accent = ACCENTS[variant];

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), {
    stiffness: 150,
    damping: 15,
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), {
    stiffness: 150,
    damping: 15,
  });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setFinePointer(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const clearAnimations = useCallback(() => {
    animRef.current.forEach((a) => {
      try {
        a.pause();
      } catch {
        // animação já finalizada
      }
    });
    animRef.current = [];
  }, []);

  useEffect(() => clearAnimations, [clearAnimations]);

  const playOneShot = useCallback(() => {
    const shot = shotRef.current;
    if (!shot || shouldReduce) return;
    clearAnimations();
    const anims: ReturnType<typeof animate>[] = [];
    const img = shot.querySelector("img") as HTMLImageElement | null;
    const fx = shot.querySelector("[data-fx]") as HTMLElement | null;
    if (!img || !fx) return;

    switch (variant) {
      case "clapperboard": {
        // CLAP de diretor: boca abre → bate com overshoot elástico → squash &
        // stretch de impacto → flash radial → settle com punch + faíscas.
        anims.push(animate(img, { rotateX: [0, -30], duration: 170, ease: "inQuad" }));
        anims.push(
          animate(img, { rotateX: [-30, 8, -3, 0], duration: 460, delay: 170, ease: "outBack" }),
        );
        anims.push(
          animate(img, {
            translateY: [0, 6, -3, 0],
            scaleY: [1, 0.94, 1.03, 1],
            duration: 340,
            delay: 310,
          }),
        );
        anims.push(
          animate(img, { scale: [1, 1.07, 1], duration: 300, delay: 450, ease: "outBack" }),
        );
        const flash = fx.querySelector("[data-fx-flash]");
        if (flash)
          anims.push(
            animate(flash, { opacity: [0, 0.9, 0], scale: [0.7, 1.3], duration: 240, delay: 350 }),
          );
        particleBurst(fx, anims, {
          colors: ["#818CF8", "#C7D2FE", "#FFFFFF"],
          count: 14,
          distance: 90,
          round: false,
        });
        break;
      }
      case "tv": {
        // CRT ligando + zap: colapsa em linha → liga elástico → scanline varre
        // → flicker de estática → pulso de glow.
        anims.push(
          animate(img, { scaleY: [1, 0.05], scaleX: [1, 1.35], duration: 150, ease: "inQuad" }),
        );
        anims.push(
          animate(img, {
            scaleY: [0.05, 1.14, 0.96, 1],
            scaleX: [1.35, 0.93, 1.03, 1],
            duration: 620,
            delay: 150,
            ease: "outElastic(1, .55)",
          }),
        );
        anims.push(
          animate(img, {
            filter: [
              "brightness(1)",
              "brightness(2.4)",
              "brightness(.6)",
              "brightness(1.7)",
              "brightness(1)",
            ],
            duration: 520,
            delay: 250,
            ease: "linear",
          }),
        );
        const scan = fx.querySelector("[data-fx-scanline]");
        if (scan)
          anims.push(
            animate(scan, {
              translateY: ["-140%", "140%"],
              opacity: [0, 1, 1, 0],
              duration: 640,
              delay: 130,
              ease: "linear",
            }),
          );
        const glow = fx.querySelector("[data-fx-glow]");
        if (glow)
          anims.push(
            animate(glow, { opacity: [0, 0.8, 0], scale: [0.8, 1.4], duration: 500, delay: 270 }),
          );
        particleBurst(fx, anims, { colors: ["#38BDF8", "#E0F2FE"], count: 10, distance: 70 });
        break;
      }
      case "controller": {
        // Rumble + combo ABXY: vibração com jolts → onda de choque → 4 botões
        // estouram em sequência → punch final.
        anims.push(
          animate(img, {
            rotateZ: [0, -9, 8, -6, 5, -3, 0],
            translateY: [0, 4, -4, 3, -2, 0],
            duration: 620,
            ease: "inOutQuad",
          }),
        );
        anims.push(
          animate(img, { scale: [1, 1.08, 1], duration: 280, delay: 420, ease: "outBack" }),
        );
        const ring = fx.querySelector("[data-fx-ring]");
        if (ring)
          anims.push(
            animate(ring, {
              scale: [0, 2.3],
              opacity: [0.9, 0],
              duration: 620,
              delay: 140,
              ease: "outCubic",
            }),
          );
        fx.querySelectorAll("[data-fx-btn]").forEach((b, i) =>
          anims.push(
            animate(b, {
              scale: [0, 1.5, 0],
              opacity: [1, 1, 0],
              translateY: [14, -52],
              duration: 460,
              delay: 60 + i * 90,
              ease: "outCubic",
            }),
          ),
        );
        break;
      }
      case "book": {
        // Folhear + luz que vaza: oscilação amortecida de rotateY na lombada,
        // luz quente explode suave e 3 páginas voam girando.
        anims.push(
          animate(img, {
            rotateY: [0, 24, -16, 9, -4, 0],
            duration: 950,
            ease: "inOutSine",
          }),
        );
        const glow = fx.querySelector("[data-fx-glow]");
        if (glow)
          anims.push(
            animate(glow, {
              opacity: [0, 0.95, 0],
              scale: [0.5, 1.6],
              duration: 760,
              delay: 140,
              ease: "outCubic",
            }),
          );
        fx.querySelectorAll("[data-fx-page]").forEach((p, i) =>
          anims.push(
            animate(p, {
              translateX: [0, () => random(26, 58)],
              translateY: [0, () => random(-40, -14)],
              rotateZ: [0, () => random(20, 50)],
              opacity: [0, 1, 0],
              duration: 620,
              delay: 180 + i * 110,
              ease: "outCubic",
            }),
          ),
        );
        break;
      }
      case "magazine": {
        // POW! de quadrinho: punch com wobble → starburst elástico entra,
        // segura, sai → speed-lines radiais + explosão de meio-tom.
        anims.push(
          animate(img, {
            scale: [1, 1.18, 0.94, 1.05, 1],
            rotateZ: [0, 5, -4, 2, 0],
            duration: 560,
            ease: "outQuad",
          }),
        );
        const pow = fx.querySelector("[data-fx-pow]");
        if (pow) {
          anims.push(
            animate(pow, {
              scale: [0, 1.35, 1],
              opacity: [0, 1, 1],
              rotateZ: [-24, 6, 0],
              duration: 480,
              delay: 60,
              ease: "outBack",
            }),
          );
          anims.push(animate(pow, { opacity: [1, 0], scale: 1.2, duration: 240, delay: 680 }));
        }
        fx.querySelectorAll("[data-fx-line]").forEach((l, i) =>
          anims.push(
            animate(l, {
              scaleX: [0, 1],
              opacity: [1, 0],
              duration: 420,
              delay: 40 + i * 40,
            }),
          ),
        );
        particleBurst(fx, anims, {
          colors: ["#F472B6", "#A78BFA", "#FDE047", "#FFFFFF"],
          count: 16,
          distance: 95,
          size: 7,
          delay: 60,
        });
        break;
      }
    }
    animRef.current = anims;
  }, [variant, shouldReduce, clearAnimations]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!finePointer || shouldReduce || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
    if (!shouldReduce) {
      animRef.current.forEach((a) => {
        try {
          a.reverse();
          a.speed = 2;
        } catch {
          // sem reverse disponível
        }
      });
    }
  };

  const handleTouch = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (shouldReduce) return;
    e.preventDefault();
    playOneShot();
    window.setTimeout(() => {
      void router.push(href);
    }, TOUCH_NAV_DELAY_MS);
  };

  return (
    <motion.a
      ref={rootRef}
      href={href.startsWith("/") ? `/${locale}${href}` : href}
      aria-label={`Explorar ${label}`}
      onMouseEnter={playOneShot}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={playOneShot}
      onClick={finePointer ? undefined : handleTouch}
      className={cn(
        "group flex flex-col items-center rounded-2xl p-2 outline-none",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05050A]",
        className,
      )}
      style={{ ["--hero-label" as string]: "#A0A0B8" }}
      data-testid={`hero-media-icon-${type}`}
    >
      <div className={styles.viewport} style={{ perspective: 1000 }}>
        <motion.div
          className={styles.stage}
          style={{
            ...(finePointer && !shouldReduce ? { rotateX, rotateY } : {}),
          }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Glow respirando (idle) — atrás do render */}
          <div
            className={styles.glowBreath}
            style={{ animationDelay: `${index * 250}ms` }}
            aria-hidden="true"
          />
          {/* Alvo das one-shots (transforms 3D reais) */}
          <div ref={shotRef} className={cn(styles.shot, styles[`shot_${variant}`])}>
            {/* Idle float contínuo */}
            <div className={styles.floatWrap} style={{ animationDelay: `${index * 250}ms` }}>
              <Image
                src={src}
                alt=""
                width={1600}
                height={900}
                priority={index === 0}
                className={styles.render}
                draggable={false}
                style={{
                  maskImage: "radial-gradient(closest-side, black 70%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(closest-side, black 70%, transparent 100%)",
                }}
              />
            </div>

            {/* Camada de efeitos (partículas HTML sobre o render, decorativas) */}
            <div className={styles.fxLayer} data-fx aria-hidden="true" style={{ color: accent }}>
              {variant === "clapperboard" && <span className={styles.fxFlash} data-fx-flash />}
              {variant === "tv" && (
                <>
                  <span className={styles.fxScanline} data-fx-scanline />
                  <span className={styles.fxGlow} data-fx-glow />
                </>
              )}
              {variant === "controller" && (
                <>
                  <span className={styles.fxRing} data-fx-ring />
                  {["#FDE047", "#F87171", "#60A5FA", "#4ADE80"].map((cor, i) => (
                    <span
                      key={i}
                      className={styles.fxBtn}
                      data-fx-btn
                      style={{ background: cor }}
                    />
                  ))}
                </>
              )}
              {variant === "book" && (
                <>
                  <span className={styles.fxGlow} data-fx-glow />
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={styles.fxPage} data-fx-page />
                  ))}
                </>
              )}
              {variant === "magazine" && (
                <>
                  <span className={styles.fxPow} data-fx-pow>
                    POW!
                  </span>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={styles.fxLineWrap}
                      style={{ transform: `rotate(${i * 60}deg)` }}
                    >
                      <span className={styles.fxLine} data-fx-line />
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <span
        className={cn(
          "text-center text-xs font-medium group-hover:text-white transition-colors",
          styles.label,
        )}
      >
        {label}
      </span>
    </motion.a>
  );
}
