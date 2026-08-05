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
import { animate } from "animejs";
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

const SPARKS = [
  { left: "58%", top: "30%", color: "#F87171" },
  { left: "78%", top: "46%", color: "#60A5FA" },
  { left: "58%", top: "62%", color: "#34D399" },
  { left: "42%", top: "46%", color: "#FBBF24" },
];

const PAGES = [
  { left: "58%", top: "30%", width: "10%", rotate: 8 },
  { left: "62%", top: "48%", width: "8%", rotate: -6 },
  { left: "56%", top: "66%", width: "11%", rotate: 10 },
];

const DOTS = [
  { left: "30%", top: "22%" },
  { left: "68%", top: "18%" },
  { left: "82%", top: "42%" },
  { left: "74%", top: "74%" },
  { left: "44%", top: "84%" },
  { left: "24%", top: "64%" },
  { left: "38%", top: "38%" },
  { left: "58%", top: "56%" },
];

const TOUCH_NAV_DELAY_MS = 700;

export function HeroMediaIcon({
  type,
  variant,
  href,
  label,
  index = 0,
  className,
}: HeroMediaIconProps) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const rootRef = useRef<HTMLAnchorElement>(null);
  const shotRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<ReturnType<typeof animate>[]>([]);
  const [finePointer, setFinePointer] = useState(false);
  const src = ASSETS[variant];

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

    switch (variant) {
      case "clapperboard": {
        // Clap: o ícone inteiro bate como claquete na base + flash no impacto.
        anims.push(
          animate(shot, {
            rotateX: [-28, 6, -2, 0],
            translateY: [0, 16, 0],
            duration: 460,
            ease: "outQuad",
          }),
        );
        const flash = shot.querySelector("[data-part=flash]");
        if (flash)
          anims.push(
            animate(flash, { opacity: [0, 0.85, 0], duration: 140, delay: 190, ease: "outQuad" }),
          );
        break;
      }
      case "tv": {
        // CRT on: colapsa e expande como TV de tubo + scanline + brilho.
        anims.push(
          animate(shot, {
            scaleY: [1, 0.06, 1.08, 1],
            scaleX: [1, 1.25, 0.97, 1],
            duration: 460,
            ease: "inOutQuad",
          }),
        );
        const scan = shot.querySelector("[data-part=scanline]");
        if (scan)
          anims.push(
            animate(scan, { translateY: [0, 220], duration: 420, delay: 60, ease: "linear" }),
          );
        const img = shot.querySelector("img");
        if (img)
          anims.push(
            animate(img, {
              filter: ["brightness(1)", "brightness(1.6)", "brightness(1)"],
              duration: 500,
              ease: "linear",
            }),
          );
        break;
      }
      case "controller": {
        // Combo: sacudidas de rotação + jolts + sparks em stagger.
        anims.push(
          animate(shot, {
            rotateZ: [0, -7, 6, -5, 4, 0],
            translateY: [0, -12, 8, -5, 0],
            duration: 620,
            ease: "outQuad",
          }),
        );
        shot.querySelectorAll("[data-part=spark]").forEach((s, i) =>
          anims.push(
            animate(s, {
              opacity: [0, 1, 0],
              scale: [0.4, 1.4],
              translateY: [0, -14],
              delay: 80 + i * 70,
              duration: 380,
              ease: "outQuad",
            }),
          ),
        );
        break;
      }
      case "book": {
        // Folhear: gira na lombada + páginas voando.
        anims.push(
          animate(shot, {
            rotateY: [22, -16, 6, 0],
            duration: 520,
            ease: "inOutQuad",
          }),
        );
        shot.querySelectorAll("[data-part=page]").forEach((p, i) =>
          anims.push(
            animate(p, {
              opacity: [0, 1, 0],
              translateX: [0, 34],
              translateY: [-4, -14],
              delay: 140 + i * 60,
              duration: 420,
              ease: "outQuad",
            }),
          ),
        );
        break;
      }
      case "magazine": {
        // POW: punch + dots explodindo radialmente + starburst.
        anims.push(
          animate(shot, {
            scale: [1, 1.14, 0.96, 1],
            rotateZ: [0, 3, -3, 0],
            duration: 480,
            ease: "outQuad",
          }),
        );
        shot.querySelectorAll("[data-part=dot]").forEach((d, i) =>
          anims.push(
            animate(d, {
              opacity: [0, 1, 0],
              translateX: [0, (Math.random() - 0.5) * 60],
              translateY: [0, (Math.random() - 0.5) * 60],
              scale: [0.3, 1.6],
              delay: i * 24,
              duration: 460,
              ease: "outQuad",
            }),
          ),
        );
        const burst = shot.querySelector("[data-part=burst]");
        if (burst)
          anims.push(
            animate(burst, {
              scale: [0, 1.25, 1],
              opacity: [0, 1, 0],
              duration: 400,
              delay: 60,
              ease: "outBack",
            }),
          );
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
      href={href}
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
                width={200}
                height={200}
                priority={index === 0}
                className={styles.render}
                draggable={false}
                style={{
                  maskImage: "radial-gradient(closest-side, black 62%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(closest-side, black 62%, transparent 100%)",
                }}
              />
            </div>

            {/* Partículas HTML (visíveis apenas nas one-shots) */}
            {variant === "clapperboard" && (
              <div className={styles.flash} data-part="flash" aria-hidden="true" />
            )}
            {variant === "tv" && (
              <div className={styles.scanline} data-part="scanline" aria-hidden="true" />
            )}
            {variant === "controller" &&
              SPARKS.map((spark, i) => (
                <span
                  key={i}
                  className={styles.spark}
                  data-part="spark"
                  style={{ ...spark, animationDelay: `${80 + i * 70}ms` }}
                  aria-hidden="true"
                />
              ))}
            {variant === "book" &&
              PAGES.map((p, i) => (
                <span
                  key={i}
                  className={styles.page}
                  data-part="page"
                  style={{ left: p.left, top: p.top, width: p.width, rotate: `${p.rotate}deg` }}
                  aria-hidden="true"
                />
              ))}
            {variant === "magazine" && (
              <>
                {DOTS.map((d, i) => (
                  <span
                    key={i}
                    className={styles.dot}
                    data-part="dot"
                    style={{ left: d.left, top: d.top, animationDelay: `${i * 24}ms` }}
                    aria-hidden="true"
                  />
                ))}
                <div className={styles.burst} data-part="burst" aria-hidden="true" />
              </>
            )}
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
