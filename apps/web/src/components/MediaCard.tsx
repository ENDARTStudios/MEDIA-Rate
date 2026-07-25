"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { animate } from "animejs";
import { colors } from "@/lib/design-tokens";
import { LazyMediaScoreBadge } from "./lazy";

export interface MediaItem {
  id: string;
  titulo: string;
  tipo: string;
  ano_lancamento: number | null;
  imagem_url: string | null;
  score?: number | null;
}

const TIPO_LABEL: Record<string, string> = {
  FILME: "filme",
  SERIE: "serie",
  GAME: "game",
  LIVRO: "livro",
};

const TIPO_ICON: Record<string, string> = {
  FILME: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-4-4l-4 1.75V6h-2v8.75L7 13l-1.75 6L12 21l6.75-2z",
  SERIE: "M4 6h16v2H4zm0 4h16v2H4zm0 4h16v2H4z",
  GAME: "M15 7.5V9h-1.5v1H15v1.5h1.5V10H18V9h-1.5V7.5zM9 12c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-3 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm12 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-3-3c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z",
  LIVRO: "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z",
};

export function MediaCard({ media }: { media: MediaItem }) {
  const t = useTranslations("catalog");
  const shouldReduce = useReducedMotion();
  const tipoLabel = TIPO_LABEL[media.tipo] ?? media.tipo;
  const scoreLabel = media.score != null ? `${media.score}/100` : "—";
  const glowRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (glowRef.current) {
      animate(glowRef.current, {
        opacity: [0, 1],
        duration: 300,
        ease: "outQuad",
      });
    }
    if (overlayRef.current) {
      animate(overlayRef.current, {
        opacity: [0, 1],
        duration: 300,
        ease: "outQuad",
      });
    }
  };

  const handleLeave = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (glowRef.current) {
      animate(glowRef.current, {
        opacity: [1, 0],
        duration: 400,
        ease: "inQuad",
      });
    }
    if (overlayRef.current) {
      animate(overlayRef.current, {
        opacity: [1, 0],
        duration: 400,
        ease: "inQuad",
      });
    }
  };

  return (
    <motion.div
      layoutId={`media-${media.id}`}
      whileHover={shouldReduce ? undefined : { scale: 1.03, y: -4 }}
      whileTap={shouldReduce ? undefined : { scale: 0.98 }}
      transition={{ duration: shouldReduce ? 0 : 0.2, ease: "easeOut" }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative group"
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute -inset-1 rounded-xl opacity-0 z-0"
        style={{ boxShadow: `0 0 30px ${colors.accent[500]}30, 0 0 8px ${colors.accent[500]}15` }}
        aria-hidden="true"
      />

      <Link
        href={`/midia/${media.id}`}
        className="relative z-10 block bg-surface-card rounded-xl shadow-card overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-black"
        role="article"
        aria-label={`${media.titulo} (${t(tipoLabel)}, ${media.ano_lancamento ?? "—"}, MEDIA Score ${scoreLabel})`}
      >
        <div className="aspect-[2/3] bg-gray-800 relative">
          {media.imagem_url ? (
            <img
              src={media.imagem_url}
              alt={`Capa de ${media.titulo}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 bg-gradient-to-br from-gray-800 to-gray-900">
              <svg className="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={TIPO_ICON[media.tipo] ?? TIPO_ICON.FILME} />
              </svg>
            </div>
          )}

          <div
            ref={overlayRef}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 flex flex-col justify-end p-4"
          >
            <span className="text-xs font-medium text-accent-400 uppercase tracking-wider">
              {t(tipoLabel)}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">
              {media.ano_lancamento ?? "—"}
            </span>
          </div>

          {media.score != null && (
            <div className="absolute top-2 right-2 z-20">
              <LazyMediaScoreBadge score={media.score} />
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-100 truncate group-hover:text-white transition-colors">
            {media.titulo}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {t(tipoLabel)} &middot; {media.ano_lancamento ?? "—"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
