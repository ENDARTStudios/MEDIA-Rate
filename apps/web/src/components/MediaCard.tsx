"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

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
  ANIME: "anime",
  COMIC: "comic",
};

const TIPO_ICON: Record<string, string> = {
  FILME:
    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-4-4l-4 1.75V6h-2v8.75L7 13l-1.75 6L12 21l6.75-2z",
  SERIE: "M4 6h16v2H4zm0 4h16v2H4zm0 4h16v2H4z",
  GAME:
    "M15 7.5V9h-1.5v1H15v1.5h1.5V10H18V9h-1.5V7.5zM9 12c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-3 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm12 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-3-3c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z",
  LIVRO:
    "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z",
};

function getScoreColor(score: number): string {
  if (score >= 90) return "#34D399";
  if (score >= 80) return "#38BDF8";
  if (score >= 70) return "#818CF8";
  if (score >= 60) return "#F59E0B";
  if (score >= 50) return "#F97316";
  return "#EF4444";
}

export function MediaCard({ media }: { media: MediaItem }) {
  const t = useTranslations("catalog");
  const [imgError, setImgError] = useState(false);

  const tipoLabel = TIPO_LABEL[media.tipo] ?? media.tipo;
  const scoreLabel = media.score != null ? `${media.score}/100` : "—";
  const aspectRatio = media.tipo === "GAME" ? "aspect-video" : "aspect-[2/3]";
  const imgHeight = media.tipo === "GAME" ? 169 : 450;

  return (
    <div className="group transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-surface-2 rounded-md">
      <Link
        href={`/pt-BR/media/${media.id}`}
        className="block bg-[#11111E] rounded-md border border-[rgba(129,140,248,0.08)] focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-2 focus:ring-offset-[#09090F]"
        role="article"
        aria-label={`${media.titulo} (${t(tipoLabel)}, ${media.ano_lancamento ?? "—"}, MEDIA Score ${scoreLabel})`}
      >
        <div className={`${aspectRatio} bg-[#1C1C2E] relative overflow-hidden rounded-t-md`}>
          {media.imagem_url && !imgError ? (
            <Image
              src={media.imagem_url}
              alt={`Capa de ${media.titulo}`}
              className="w-full h-full object-cover"
              width={300}
              height={imgHeight}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#9CA3AF]">
              <svg
                className="w-12 h-12 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d={TIPO_ICON[media.tipo] ?? TIPO_ICON.FILME}
                />
              </svg>
            </div>
          )}

          <span className="absolute top-2 left-2 text-xs text-[#9CA3AF] bg-[#1C1C2E] rounded-full px-2 py-0.5">
            {t(tipoLabel)}
          </span>

          {media.score != null && (
            <span
              className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-bold bg-[#11111E] border border-white/5"
              style={{ color: getScoreColor(media.score) }}
            >
              {media.score}/100
            </span>
          )}
        </div>

        <div className="p-3 bg-[#11111E] rounded-b-md">
          <h3 className="font-heading text-sm font-medium text-[#EDE7DC] line-clamp-2">
            {media.titulo}
          </h3>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {media.ano_lancamento ?? "—"}
          </p>
        </div>
      </Link>
    </div>
  );
}
