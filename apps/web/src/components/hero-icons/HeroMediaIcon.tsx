"use client";

/**
 * HeroMediaIcon (addendum §2-4) — ícone 3D-em-camadas individual.
 *
 * - Tilt de cursor via Motion (rotateX/rotateY com spring leve, perspective
 *   800px, translateZ por camada via preserve-3d) — apenas em dispositivos
 *   com hover real (matchMedia '(hover: hover) and (pointer: fine)').
 * - Animação one-shot por variante via Anime.js (500–700ms, reverse rápido
 *   200ms ao sair) — claquete, TV, controle, livro, revista.
 * - Teclado: elemento focável; focus-visible dispara a mesma one-shot.
 * - Touch: toque dispara a one-shot e navega após ~700ms.
 * - prefers-reduced-motion: estático, com hover simples (brightness/borda).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  ClapperboardArt,
  TvArt,
  ControllerArt,
  BookArt,
  MagazineArt,
  type AnimationVariant,
} from "./icon-art";
import { MEDIA_ACCENTS } from "@/components/media-rate-ui/CategoryChip";
import type { MediaType } from "@/lib/types";

export interface HeroMediaIconProps {
  type: MediaType;
  variant: AnimationVariant;
  href: string;
  label: string;
  className?: string;
}

const ART: Record<AnimationVariant, (p: { id: string }) => React.ReactElement> = {
  clapperboard: ({ id }) => <ClapperboardArt id={id} />,
  tv: ({ id }) => <TvArt id={id} />,
  controller: ({ id }) => <ControllerArt id={id} />,
  book: ({ id }) => <BookArt id={id} />,
  magazine: ({ id }) => <MagazineArt id={id} />,
};

const TOUCH_NAV_DELAY_MS = 700;

export function HeroMediaIcon({ type, variant, href, label, className }: HeroMediaIconProps) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const rootRef = useRef<HTMLAnchorElement>(null);
  const animRef = useRef<ReturnType<typeof animate>[]>([]);
  const [finePointer, setFinePointer] = useState(false);
  const accent = MEDIA_ACCENTS[type];
  const uid = `hero-${variant}-${type}`;

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
        const boca = el.querySelector("[data-part=boca]");
        const flash = el.querySelector("[data-part=flash]");
        if (boca)
          anims.push(animate(boca, { rotate: [-22, -3, 0], duration: 500, ease: "outBack" }));
        if (flash)
          anims.push(
            animate(flash, { opacity: [0, 0.4, 0], duration: 200, delay: 350, ease: "outQuad" }),
          );
        break;
      }
      case "tv": {
        const scan = el.querySelector("[data-part=scanline]");
        const tela = el.querySelector("[data-part=tela]");
        if (scan)
          anims.push(
            animate(scan, { translateY: ["-110%", "110%"], duration: 400, ease: "linear" }),
          );
        if (tela)
          anims.push(
            animate(tela, {
              filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"],
              duration: 500,
            }),
          );
        break;
      }
      case "controller": {
        const botoes = el.querySelectorAll("[data-part=botao]");
        const stick = el.querySelector("[data-part=stick]");
        botoes.forEach((b, i) =>
          anims.push(
            animate(b, {
              opacity: [0.3, 1],
              scale: [0.9, 1.05, 1],
              duration: 250,
              delay: i * 80,
            }),
          ),
        );
        if (stick)
          anims.push(animate(stick, { rotate: 360, duration: 600, delay: 240, ease: "linear" }));
        break;
      }
      case "book": {
        const capa = el.querySelector("[data-part=capa]");
        const paginas = el.querySelector("[data-part=paginas]");
        const linhas = el.querySelectorAll("[data-part=linha]");
        if (capa) anims.push(animate(capa, { rotateY: [0, -25], duration: 500, ease: "outCubic" }));
        if (paginas) anims.push(animate(paginas, { opacity: [0, 1], duration: 300, delay: 300 }));
        linhas.forEach((l, i) =>
          anims.push(
            animate(l, { opacity: [0, 1], translateX: [6, 0], duration: 250, delay: 350 + i * 40 }),
          ),
        );
        break;
      }
      case "magazine": {
        const particulas = el.querySelectorAll("[data-part=particula]");
        particulas.forEach((p, i) =>
          anims.push(
            animate(p, {
              translateX: [0, (Math.random() - 0.5) * 60],
              translateY: [0, (Math.random() - 0.5) * 60],
              opacity: [1, 0],
              scale: [0, 1.5],
              duration: 450,
              delay: i * 30,
              ease: "outQuad",
            }),
          ),
        );
        anims.push(animate(el, { scale: [1, 1.08, 1], duration: 250, ease: "outQuad" }));
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
      // Reverse rápido (200ms) ao sair.
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
      aria-label={label}
      onMouseEnter={playOneShot}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={playOneShot}
      onClick={finePointer ? undefined : handleTouch}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-xl p-3 focus:outline-none",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05050A]",
        className,
      )}
      style={{
        ...(finePointer && !shouldReduce ? { perspective: 800 } : {}),
        ["--icon-accent" as string]: accent,
      }}
      data-testid={`hero-media-icon-${type}`}
    >
      <motion.div
        style={{
          width: "100%",
          aspectRatio: "1",
          transformStyle: "preserve-3d",
          ...(finePointer && !shouldReduce ? { rotateX, rotateY } : {}),
        }}
        className="relative icon-shadow"
        whileTap={{ scale: 0.95 }}
      >
        <div
          className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ boxShadow: `0 0 0 1px ${accent}55, 0 0 24px ${accent}30` }}
          aria-hidden="true"
        />
        <div className="h-full w-full" style={{ transformStyle: "preserve-3d" }}>
          {ART[variant]({ id: uid })}
        </div>
      </motion.div>
      <span className="text-center text-xs font-medium text-[#A0A0B8] transition-colors group-hover:text-[#F5F5F7]">
        {label}
      </span>
    </motion.a>
  );
}
