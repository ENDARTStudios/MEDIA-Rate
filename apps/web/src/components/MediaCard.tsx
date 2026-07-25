"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { animate } from "animejs";
import { colors } from "@/lib/design-tokens";
import { MediaScoreBadge } from "./MediaScoreBadge";

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

export function MediaCard({ media }: { media: MediaItem }) {
  const t = useTranslations("catalog");
  const shouldReduce = useReducedMotion();
  const tipoLabel = TIPO_LABEL[media.tipo] ?? media.tipo;
  const scoreLabel = media.score != null ? `${media.score}/100` : "—";
  const glowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (glowRef.current) {
      animate(glowRef.current, {
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
  };

  return (
    <motion.div
      ref={cardRef}
      layoutId={`media-${media.id}`}
      whileHover={shouldReduce ? undefined : { scale: 1.03, y: -4 }}
      whileTap={shouldReduce ? undefined : { scale: 0.98 }}
      transition={{ duration: shouldReduce ? 0 : 0.2, ease: "easeOut" }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative"
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0"
        style={{ boxShadow: `0 0 24px ${colors.accent[500]}33, inset 0 0 0 1px ${colors.accent[500]}4D` }}
        aria-hidden="true"
      />
      <Link
        href={`/midia/${media.id}`}
        className="block bg-surface-card rounded-lg shadow-card overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-black"
        role="article"
        aria-label={`${media.titulo} (${t(tipoLabel)}, ${media.ano_lancamento ?? "—"}, MEDIA Score ${scoreLabel})`}
      >
        <div className="aspect-[2/3] bg-gray-800 relative">
          {media.imagem_url ? (
            <img
              src={media.imagem_url}
              alt={`Capa de ${media.titulo}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {media.score != null && (
            <div className="absolute top-2 right-2">
              <MediaScoreBadge score={media.score} />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-100 truncate">{media.titulo}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {t(tipoLabel)} &middot; {media.ano_lancamento ?? "—"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
