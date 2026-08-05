"use client";

/**
 * Hero Media Icon v3 — SVGs ilustrativos premium (T5a-hero-3d-fix-v3).
 *
 * Camadas HTML reais com translateZ em pixels (parallax real):
 *   glow (-60px) → base rotacionada (0px) → arte SVG (40px) → flare (80px)
 *
 * - Coreografia one-shot rica via Anime.js (data-parts DENTRO dos SVGs):
 *   claquete: boca abre [-22, 3, 0] + flash [0, 0.6, 0]
 *   TV: scanline varre a tela + tela acende brightness(1.5)
 *   controle: 4 botões acendem em elastic stagger + analógicos giram 1 turn
 *   livro: capa abre rotateY(-25) + linhas de texto revelam em stagger
 *   HQ: 6 partículas explodem ±40px + ícone dá um punch
 * - Tilt contínuo via Motion (springs 150/15) — apenas com
 *   '(hover: hover) and (pointer: fine)'.
 * - prefers-reduced-motion: estático e visualmente rico (as artes têm
 *   gradientes, texturas, sombras e detalhes por padrão).
 * - Teclado: focus dispara a one-shot; anel focus-visible no accent.
 * - Touch: toque dispara a one-shot e navega após 700ms; whileTap 0.95.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { animate } from "animejs";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import styles from "./hero-icons.module.css";
import { FilmArt, TvArt, GameArt, BookArt, MagazineArt } from "./hero-svg-art";
import { MEDIA_ACCENTS } from "@/components/media-rate-ui/CategoryChip";
import type { MediaType } from "@/lib/types";

export type AnimationVariant = "clapperboard" | "tv" | "controller" | "book" | "magazine";

export interface HeroMediaIconProps {
  type: MediaType;
  variant: AnimationVariant;
  href: string;
  label: string;
  className?: string;
}

const ARTS: Record<AnimationVariant, ComponentType> = {
  clapperboard: FilmArt,
  tv: TvArt,
  controller: GameArt,
  book: BookArt,
  magazine: MagazineArt,
};

const ACCENTS: Record<AnimationVariant, string> = {
  clapperboard: MEDIA_ACCENTS.movie,
  tv: MEDIA_ACCENTS.series,
  controller: MEDIA_ACCENTS.game,
  book: MEDIA_ACCENTS.book,
  magazine: MEDIA_ACCENTS.comic,
};

const TOUCH_NAV_DELAY_MS = 700;

export function HeroMediaIcon({ type, variant, href, label, className }: HeroMediaIconProps) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const rootRef = useRef<HTMLAnchorElement>(null);
  const animRef = useRef<ReturnType<typeof animate>[]>([]);
  const [finePointer, setFinePointer] = useState(false);
  const accent = ACCENTS[variant];
  const Art = ARTS[variant];

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
    const el = rootRef.current;
    if (!el || shouldReduce) return;
    clearAnimations();
    const anims: ReturnType<typeof animate>[] = [];

    switch (variant) {
      case "clapperboard": {
        // Claquete: boca abre com overshoot e o flash estoura no impacto.
        const mouth = el.querySelector("[data-part=mouth]");
        const flash = el.querySelector("[data-part=flash]");
        if (mouth)
          anims.push(animate(mouth, { rotate: [-22, 3, 0], duration: 400, ease: "outQuad" }));
        if (flash)
          anims.push(
            animate(flash, { opacity: [0, 0.6, 0], duration: 120, delay: 250, ease: "outQuad" }),
          );
        break;
      }
      case "tv": {
        // TV: scanline varre a tela enquanto ela acende.
        const scan = el.querySelector("[data-part=scanline]");
        const screen = el.querySelector("[data-part=screen]");
        if (scan)
          anims.push(
            animate(scan, { translateY: ["-100%", "200%"], duration: 400, ease: "linear" }),
          );
        if (screen)
          anims.push(
            animate(screen, {
              filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
              duration: 400,
              ease: "linear",
            }),
          );
        break;
      }
      case "controller": {
        // Controle: combo de botões acende em elastic stagger + analógicos giram.
        const botoes = el.querySelectorAll('[data-part^="button-"]');
        const analogs = el.querySelectorAll("[data-part=analog]");
        botoes.forEach((b, i) =>
          anims.push(
            animate(b, {
              opacity: [0.3, 1],
              scale: [0.9, 1.05, 1],
              delay: i * 80,
              duration: 300,
              ease: "outElastic(1, .6)",
            }),
          ),
        );
        analogs.forEach((a, i) =>
          anims.push(
            animate(a, { rotate: 360, duration: 500, delay: 240 + i * 60, ease: "inOutQuad" }),
          ),
        );
        break;
      }
      case "book": {
        // Livro: capa abre e as linhas de texto revelam o conteúdo em stagger.
        const cover = el.querySelector("[data-part=cover]");
        const linhas = el.querySelectorAll('[data-part^="line-"]');
        if (cover)
          anims.push(animate(cover, { rotateY: [0, -25], duration: 500, ease: "inOutQuad" }));
        linhas.forEach((l, i) =>
          anims.push(
            animate(l, {
              opacity: [0, 1],
              translateY: [10, 0],
              delay: 300 + i * 40,
              duration: 300,
              ease: "inOutQuad",
            }),
          ),
        );
        break;
      }
      case "magazine": {
        // HQ: partículas explodem em direções aleatórias e o quadrinho dá um punch.
        const dots = el.querySelectorAll('[data-part^="dot-"]');
        const icon = el.querySelector("[data-part=icon]");
        dots.forEach((d, i) =>
          anims.push(
            animate(d, {
              translateX: [0, (Math.random() - 0.5) * 80],
              translateY: [0, (Math.random() - 0.5) * 80],
              scale: [0, 1.5],
              opacity: [1, 0],
              delay: i * 20,
              duration: 450,
              ease: "outQuad",
            }),
          ),
        );
        if (icon)
          anims.push(animate(icon, { scale: [1, 1.08, 1], duration: 250, ease: "outQuad" }));
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

  const baseStyle = {
    background: `linear-gradient(135deg, ${accent}dd, ${accent}55)`,
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
      <div className={styles.iconContainer} style={{ perspective: 1000 }}>
        <motion.div
          className={styles.stage}
          style={{
            ...(finePointer && !shouldReduce ? { rotateX, rotateY } : {}),
          }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Camada 1: glow de fundo */}
          <div
            className={styles.glow}
            style={{
              background: `radial-gradient(circle, ${accent}40 0%, transparent 70%)`,
            }}
            aria-hidden="true"
          />
          {/* Camada 2: base sólida (plataforma) */}
          <div className={styles.base} style={baseStyle} aria-hidden="true" />
          {/* Camada 3: arte SVG ilustrativa */}
          <div className={styles.icon} aria-hidden="true">
            <Art />
          </div>
          {/* Camada 4: flare frontal */}
          <div className={styles.flare} aria-hidden="true" />
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
