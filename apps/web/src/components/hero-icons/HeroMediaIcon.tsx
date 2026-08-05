"use client";

/**
 * Hero Media Icon v2 — arquitetura híbrida (T5a-hero-3d-fix-v2).
 *
 * Lucide (ícone central premium) + camadas HTML reais com translateZ:
 *   glow (-60px) · base rotacionada (0px) · ícone (40px) · flare (80px)
 *
 * - Tilt contínuo via Motion (springs 150/15) — apenas com
 *   '(hover: hover) and (pointer: fine)'.
 * - Coreografia one-shot via Anime.js em classes CSS estáveis
 *   (`.hero-flash`, `.hero-scanline`, `.hero-button`, `.hero-line`,
 *   `.hero-dot` — scoped pelo root, sem colisão entre ícones).
 * - prefers-reduced-motion: estático e visualmente rico (glow + base + flare).
 * - Teclado: focus dispara a one-shot; anel focus-visible no accent.
 * - Touch: toque dispara a one-shot e navega após 700ms; whileTap 0.95.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Tv,
  Gamepad2,
  BookOpen,
  BookMarked,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { animate } from "animejs";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import styles from "./hero-icons.module.css";
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

const ICONS: Record<AnimationVariant, LucideIcon> = {
  clapperboard: Clapperboard,
  tv: Tv,
  controller: Gamepad2,
  book: BookOpen,
  magazine: BookMarked,
};

const ACCENTS: Record<AnimationVariant, string> = {
  clapperboard: MEDIA_ACCENTS.movie,
  tv: MEDIA_ACCENTS.series,
  controller: MEDIA_ACCENTS.game,
  book: MEDIA_ACCENTS.book,
  magazine: MEDIA_ACCENTS.comic,
};

const TOUCH_NAV_DELAY_MS = 700;

/** Posições dos botões do controle (divs absolutas, % do container). */
const BUTTON_POSITIONS = [
  { left: "58%", top: "28%" },
  { left: "74%", top: "44%" },
  { left: "58%", top: "60%" },
  { left: "42%", top: "44%" },
];
const BUTTON_COLORS = ["#F87171", "#60A5FA", "#FBBF24", "#34D399"];

/** Posições das linhas do livro e partículas da HQ. */
const LINE_POSITIONS = [
  { left: "28%", top: "46%", width: "44%" },
  { left: "28%", top: "54%", width: "36%" },
  { left: "28%", top: "62%", width: "40%" },
];
const DOT_POSITIONS = [
  { left: "44%", top: "38%" },
  { left: "56%", top: "34%" },
  { left: "64%", top: "48%" },
  { left: "50%", top: "62%" },
  { left: "38%", top: "56%" },
  { left: "60%", top: "70%" },
];

export function HeroMediaIcon({ type, variant, href, label, className }: HeroMediaIconProps) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const rootRef = useRef<HTMLAnchorElement>(null);
  const animRef = useRef<ReturnType<typeof animate>[]>([]);
  const [finePointer, setFinePointer] = useState(false);
  const accent = ACCENTS[variant];
  const Icon = ICONS[variant];

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
        const icon = el.querySelector(".hero-lucide-icon");
        const flash = el.querySelector("[data-part=flash]");
        if (icon)
          anims.push(animate(icon, { rotate: [-15, 5, 0], duration: 400, ease: "outBack" }));
        if (flash)
          anims.push(
            animate(flash, { opacity: [0, 0.6, 0], duration: 160, delay: 260, ease: "outQuad" }),
          );
        break;
      }
      case "tv": {
        const scan = el.querySelector("[data-part=scanline]");
        const icon = el.querySelector(".hero-lucide-icon");
        if (scan)
          anims.push(
            animate(scan, { translateY: ["-100%", "400%"], duration: 400, ease: "linear" }),
          );
        if (icon)
          anims.push(
            animate(icon, {
              filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
              duration: 500,
            }),
          );
        break;
      }
      case "controller": {
        const botoes = el.querySelectorAll("[data-part=botao]");
        const icon = el.querySelector(".hero-lucide-icon");
        botoes.forEach((b, i) =>
          anims.push(
            animate(b, {
              opacity: [0.35, 1],
              scale: [0.9, 1.1, 1],
              duration: 250,
              delay: i * 80,
            }),
          ),
        );
        if (icon)
          anims.push(
            animate(icon, { rotate: [0, -8, 8, 0], duration: 450, delay: 240, ease: "outQuad" }),
          );
        break;
      }
      case "book": {
        const capa = el.querySelector(".hero-lucide-icon");
        const linhas = el.querySelectorAll("[data-part=linha]");
        if (capa) anims.push(animate(capa, { rotateY: [0, -25], duration: 500, ease: "outCubic" }));
        linhas.forEach((l, i) =>
          anims.push(
            animate(l, { opacity: [0, 1], translateX: [8, 0], duration: 250, delay: 320 + i * 40 }),
          ),
        );
        break;
      }
      case "magazine": {
        const dots = el.querySelectorAll("[data-part=dot]");
        const icon = el.querySelector(".hero-lucide-icon");
        dots.forEach((d, i) =>
          anims.push(
            animate(d, {
              translateX: [0, (Math.random() - 0.5) * 70],
              translateY: [0, (Math.random() - 0.5) * 70],
              opacity: [1, 0],
              scale: [0, 1.4],
              duration: 450,
              delay: i * 25,
              ease: "outQuad",
            }),
          ),
        );
        anims.push(animate(el, { scale: [1, 1.06, 1], duration: 250, ease: "outQuad" }));
        if (icon)
          anims.push(animate(icon, { opacity: [1, 0.5, 1], duration: 300, ease: "outQuad" }));
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
          {/* Camada 3: ícone Lucide */}
          <div className={styles.icon} aria-hidden="true">
            <Icon
              className="hero-lucide-icon"
              size={64}
              strokeWidth={1.5}
              style={{ color: accent }}
            />
          </div>
          {/* Camada 4: flare frontal */}
          <div className={styles.flare} aria-hidden="true" />

          {/* Elementos de coreografia (scoped por variante) */}
          {variant === "clapperboard" && (
            <div className={styles.flash} data-part="flash" aria-hidden="true" />
          )}
          {variant === "tv" && (
            <div className={styles.scanline} data-part="scanline" aria-hidden="true" />
          )}
          {variant === "controller" && (
            <div className={styles.buttons} aria-hidden="true">
              {BUTTON_POSITIONS.map((pos, i) => (
                <span
                  key={i}
                  className={styles.button}
                  data-part="botao"
                  style={{ ...pos, backgroundColor: BUTTON_COLORS[i] }}
                />
              ))}
            </div>
          )}
          {variant === "book" && (
            <div className={styles.lines} aria-hidden="true">
              {LINE_POSITIONS.map((pos, i) => (
                <span key={i} className={styles.line} data-part="linha" style={pos} />
              ))}
            </div>
          )}
          {variant === "magazine" && (
            <div className={styles.dots} aria-hidden="true">
              {DOT_POSITIONS.map((pos, i) => (
                <span key={i} className={styles.dot} data-part="dot" style={pos} />
              ))}
              <Sparkles
                className="hero-lucide-sparkles absolute"
                style={{ color: "white", opacity: 0.7, right: "8%", top: "10%" }}
                size={20}
                strokeWidth={2}
              />
            </div>
          )}
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
