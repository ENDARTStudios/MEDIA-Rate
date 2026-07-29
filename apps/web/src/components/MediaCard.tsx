"use client";

import { useRef, useState, useEffect, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { motion, useReducedMotion } from "motion/react";
import { animate } from "animejs";
import { ScoreDial } from "@/components/ui/score-dial";
import { WatchlistButton } from "./WatchlistButton";

export interface MediaItem {
  id: string;
  titulo: string;
  tipo: string;
  ano_lancamento: number | null;
  imagem_url: string | null;
  score?: number | null;
}

const TIPO_LABEL: Record<string, string> = {
  FILME: "filme", SERIE: "serie", GAME: "game", LIVRO: "livro", ANIME: "anime", COMIC: "comic",
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
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<ReturnType<typeof animate>[]>([]);

  useEffect(() => {
    return () => {
      animRef.current.forEach((a) => {
        try { a.pause(); } catch {}
      });
    };
  }, []);

  const NEON_COLOR = "#818CF8";

  const handleMove = (e: MouseEvent) => {
    if (shouldReduce || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (y - 0.5) * 8;
    const ry = (x - 0.5) * -8;
    cardRef.current.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
    cardRef.current.style.boxShadow = `${-ry * 2}px ${-rx * 2}px 20px rgba(0,0,0,0.5), 0 0 30px ${NEON_COLOR}${Math.round(0.15 * Math.max(x, y) * 255).toString(16).padStart(2, "0")}`;

    if (shineRef.current) {
      shineRef.current.style.background = `linear-gradient(${x * 60 + 15}deg, rgba(129,140,248,0.08) 0%, transparent 60%)`;
      shineRef.current.style.opacity = "1";
    }
  };

  const handleEnter = () => {
    if (shouldReduce) return;
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 0.15s ease-out, box-shadow 0.15s ease-out";
    }
    animRef.current = [];
    if (glowRef.current) animRef.current.push(animate(glowRef.current, { opacity: [0, 1], duration: 300, ease: "outQuad" }));
    if (overlayRef.current) animRef.current.push(animate(overlayRef.current, { opacity: [0, 1], duration: 300, ease: "outQuad" }));
  };

  const handleLeave = () => {
    if (shouldReduce || !cardRef.current) return;
    cardRef.current.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    cardRef.current.style.boxShadow = "";
    cardRef.current.style.transition = "transform 0.4s ease-out, box-shadow 0.4s ease-out";

    animRef.current = [];
    if (glowRef.current) animRef.current.push(animate(glowRef.current, { opacity: [1, 0], duration: 400, ease: "inQuad" }));
    if (overlayRef.current) animRef.current.push(animate(overlayRef.current, { opacity: [1, 0], duration: 400, ease: "inQuad" }));
    if (shineRef.current) { shineRef.current.style.opacity = "0"; }
  };

  const aspectRatio = "aspect-[2/3]";

  return (
    <motion.div
      ref={cardRef}
      layoutId={`media-${media.id}`}
      whileTap={shouldReduce ? undefined : { scale: 0.97 }}
      transition={{ duration: shouldReduce ? 0 : 0.15, ease: "easeOut" }}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative group cursor-pointer rounded-md"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute -inset-1 rounded-md opacity-0 z-0"
        style={{ boxShadow: `0 0 30px ${NEON_COLOR}30, 0 0 8px ${NEON_COLOR}15` }}
        aria-hidden="true"
      />

      <div className="absolute top-2 left-12 z-20" onClick={(e) => e.stopPropagation()}>
        <WatchlistButton mediaId={media.id} />
      </div>

      <Link
        href={`/media/${media.id}`}
        className="relative z-10 block bg-[#11111E] rounded-md border border-[rgba(129,140,248,0.1)] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-2 focus:ring-offset-[#09090F]"
        role="article"
        aria-label={`${media.titulo} (${t(tipoLabel)}, ${media.ano_lancamento ?? "—"}, MEDIA Score ${scoreLabel})`}
      >
        <div className={`${aspectRatio} bg-[#1C1C2E] relative overflow-hidden`}>
          {media.imagem_url ? (
            <ImageWithFallback
              src={media.imagem_url}
              alt={`Capa de ${media.titulo}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              width={300}
              height={450}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#9CA3AF] bg-gradient-to-br from-[#1C1C2E] to-[#09090F]">
              <svg className="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={TIPO_ICON[media.tipo] ?? TIPO_ICON.FILME} />
              </svg>
            </div>
          )}

          <div ref={shineRef} className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300" aria-hidden="true" />

          <div
            ref={overlayRef}
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 flex flex-col justify-end p-4"
          >
            <span className="text-xs font-semibold text-[#818CF8] uppercase tracking-widest">{t(tipoLabel)}</span>
            <span className="text-xs text-[#9CA3AF] mt-0.5">{media.ano_lancamento ?? "—"}</span>
          </div>

          {media.score != null && (
            <div className="absolute top-2 right-2 z-20">
              <ScoreDial
                score={media.tipo === "GAME" ? media.score : media.score / 10}
                size="sm"
                scale={media.tipo === "GAME" ? "0-100" : "0-10"}
              />
            </div>
          )}
        </div>

        <div className="p-3 bg-[#11111E] rounded-b-md">
          <h3 className="font-heading text-sm font-medium text-[#EDE7DC] truncate group-hover:text-[#EDE7DC] transition-colors">{media.titulo}</h3>
          <p className="text-xs text-[#9CA3AF] mt-1">{t(tipoLabel)} &middot; {media.ano_lancamento ?? "—"}</p>
        </div>
      </Link>
    </motion.div>
  );
}

function ImageWithFallback({ src, alt, className, width, height, sizes }: { src: string; alt: string; className: string; width: number; height: number; sizes: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-[#1C1C2E] to-[#09090F] text-[#9CA3AF] ${className}`}>
        <svg className="w-10 h-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      sizes={sizes}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
