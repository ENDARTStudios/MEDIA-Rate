"use client";

/**
 * HeroMediaIcon (addendum 1, D-204) — ícone 3D-em-camadas com tilt e
 * coreografia one-shot por mídia.
 *
 * - Tilt de cursor (Motion): rotateX ±8 / rotateY ±10 com springs 150/15;
 *   perspective 800px no pai; preserve-3d; translateZ por camada.
 *   SÓ desktop: matchMedia "(hover: hover) and (pointer: fine)".
 * - One-shot (Anime.js, 500-700ms, reverse 200ms ao sair):
 *   clapperboard: boca -22°→0 com overshoot + flash 120ms no impacto
 *   tv: scanline translateY -100%→100% (clip) + brightness 1→1.3→1
 *   controller: 4 botões acendem em sequência 80ms + analógico 360°
 *   book: capa rotateY 0→-25 (lombada) + 3 linhas stagger + brilho radial
 *   magazine: partículas meio-tom explodem + punch 1→1.08→1
 * - prefers-reduced-motion: tilt e one-shot desabilitados (estático).
 * - Teclado: <a> focável dispara a one-shot; anel de foco no accent.
 * - Touch: toque dispara a one-shot e navega após ~700ms.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";
import { ClapperboardIcon } from "./icons/ClapperboardIcon";
import { TvIcon } from "./icons/TvIcon";
import { ControllerIcon } from "./icons/ControllerIcon";
import { BookIcon } from "./icons/BookIcon";
import { MagazineIcon } from "./icons/MagazineIcon";

export type AnimationVariant = "clapperboard" | "tv" | "controller" | "book" | "magazine";

export interface HeroMediaIconProps {
  type: MediaType;
  animationVariant: AnimationVariant;
  href: string;
  label: string;
  className?: string;
}

const ICONS: Record<AnimationVariant, () => React.ReactNode> = {
  clapperboard: () => <ClapperboardIcon />,
  tv: () => <TvIcon />,
  controller: () => <ControllerIcon />,
  book: () => <BookIcon />,
  magazine: () => <MagazineIcon />,
};

const TOUCH_NAV_DELAY_MS = 700;

export function HeroMediaIcon({
  type,
  animationVariant,
  href,
  label,
  className,
}: HeroMediaIconProps) {
  const shouldReduce = useReducedMotion();
  const locale = useLocale();
  const t = useTranslations("catalog");
  const rootRef = useRef<HTMLAnchorElement>(null);
  const animRef = useRef<ReturnType<typeof animate>[]>([]);
  const [finePointer, setFinePointer] = useState(false);
  const accent = CATEGORY_TOKENS[type].color;
  const Art = ICONS[animationVariant];

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
        // já finalizada
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

    switch (animationVariant) {
      case "clapperboard": {
        const mouth = el.querySelector("[data-part=mouth]");
        const flash = el.querySelector("[data-part=flash]");
        if (mouth)
          anims.push(animate(mouth, { rotate: [-22, -3, 0], duration: 500, ease: "outBack" }));
        if (flash) anims.push(animate(flash, { opacity: [0, 0.4, 0], duration: 120, delay: 350 }));
        break;
      }
      case "tv": {
        const scan = el.querySelector("[data-part=scanline]");
        const screen = el.querySelector("[data-part=screen]");
        if (scan)
          anims.push(
            animate(scan, { translateY: ["-100%", "100%"], duration: 400, ease: "linear" }),
          );
        if (screen)
          anims.push(
            animate(screen, {
              filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"],
              duration: 400,
            }),
          );
        break;
      }
      case "controller": {
        el.querySelectorAll("[data-part^=button-]").forEach((b, i) =>
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
        const analog = el.querySelector("[data-part=analog]");
        if (analog)
          anims.push(
            animate(analog, { rotate: 360, duration: 500, delay: 240, ease: "inOutQuad" }),
          );
        break;
      }
      case "book": {
        const cover = el.querySelector("[data-part=cover]");
        const linhas = el.querySelectorAll("[data-part^=line-]");
        const glow = el.querySelector("[data-part=glow]");
        if (cover)
          anims.push(animate(cover, { rotateY: [0, -25], duration: 500, ease: "inOutQuad" }));
        linhas.forEach((l, i) =>
          anims.push(animate(l, { opacity: [0, 1], delay: 300 + i * 40, duration: 250 })),
        );
        if (glow) anims.push(animate(glow, { opacity: [0, 0.5, 0], duration: 600, delay: 100 }));
        break;
      }
      case "magazine": {
        el.querySelectorAll("[data-part^=dot-]").forEach((d, i) =>
          anims.push(
            animate(d, {
              translateX: [0, (Math.random() - 0.5) * 40],
              translateY: [0, (Math.random() - 0.5) * 40],
              scale: [0, 1.5],
              opacity: [1, 0],
              delay: i * 20,
              duration: 450,
              ease: "outQuad",
            }),
          ),
        );
        const icon = el.querySelector("[data-part=icon]");
        if (icon) anims.push(animate(icon, { scale: [1, 1.08, 1], duration: 250 }));
        break;
      }
    }
    animRef.current = anims;
  }, [animationVariant, shouldReduce, clearAnimations]);

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
          // sem reverse
        }
      });
    }
  };

  const handleTouch = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (shouldReduce) return;
    e.preventDefault();
    playOneShot();
    window.setTimeout(() => {
      window.location.href = href;
    }, TOUCH_NAV_DELAY_MS);
  };

  return (
    <motion.a
      ref={rootRef}
      // T273: href com prefixo do locale ativo (localePrefix: "always") e
      // aria-label localizado — nunca "Explorar" PT hardcoded em EN/ES.
      href={href.startsWith("/") ? `/${locale}${href}` : href}
      aria-label={t("exploreCategory", { label })}
      onMouseEnter={playOneShot}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={playOneShot}
      onClick={finePointer ? undefined : handleTouch}
      whileTap={shouldReduce ? undefined : { scale: 0.95 }}
      className={cn(
        "group flex flex-col items-center rounded-2xl p-2 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05050A]",
        className,
      )}
      style={{ ["--hero-accent" as string]: accent }}
      data-testid={`hero-media-icon-${type}`}
    >
      <div className="hero-icon-viewport" style={{ perspective: 800 }}>
        <motion.div
          className="hero-icon-stage"
          style={{
            transformStyle: "preserve-3d",
            ...(finePointer && !shouldReduce ? { rotateX, rotateY } : {}),
          }}
        >
          {/* Camada de fundo (mais distante) */}
          <div
            className="hero-icon-layer hero-icon-layer--bg"
            style={{ transform: "translateZ(-24px)" }}
            aria-hidden="true"
          />
          {/* Corpo (meio) */}
          <div
            className="hero-icon-layer hero-icon-layer--body"
            style={{ transform: "translateZ(0px)" }}
            aria-hidden="true"
          >
            <Art />
          </div>
          {/* Destaque (mais à frente) */}
          <div
            className="hero-icon-layer hero-icon-layer--fg"
            style={{ transform: "translateZ(16px)" }}
            aria-hidden="true"
          />
        </motion.div>
      </div>

      <span className="mt-2 text-center text-[11px] font-medium text-[#A0A0B8] transition-colors group-hover:text-[#F5F5F7]">
        {label}
      </span>
    </motion.a>
  );
}
