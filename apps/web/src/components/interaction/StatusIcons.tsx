"use client";

import {
  Bookmark,
  CirclePause,
  LoaderCircle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Plus,
  type LucideIcon,
} from "lucide-react";
import type { ConsumoStatus, Reacao } from "@/lib/api-interactions";
import type { MediaType } from "@/lib/types";

/**
 * Iconografia de status + reação (Addendum 4 §4.4) reaproveitando tokens:
 * QUERO=outline bookmark; CONSUMINDO=preenchido+anel de progresso;
 * CONCLUIDO=selo de check; ABANDONADO=pause neutro/cinza (NUNCA vermelho);
 * GOSTEI=👍 #34D399; NAO_GOSTEI=👎 #F87171 (mesmas cores do ScoreDial).
 */

export const STATUS_COLORS: Record<ConsumoStatus, string> = {
  QUERO_CONSUMIR: "#818CF8",
  CONSUMINDO: "#38BDF8",
  CONCLUIDO: "#34D399",
  ABANDONADO: "#9CA3AF",
};

export const REACTION_COLORS: Record<Reacao, string> = {
  GOSTEI: "#34D399",
  NAO_GOSTEI: "#F87171",
};

export const STATUS_GLYPHS: Record<ConsumoStatus, LucideIcon> = {
  QUERO_CONSUMIR: Bookmark,
  CONSUMINDO: LoaderCircle,
  CONCLUIDO: CheckCircle2,
  ABANDONADO: CirclePause,
};

/** Ícone do status com a cor por token; CONSUMINDO ganha um anel de progresso. */
export function StatusGlyph({
  status,
  size = 16,
  className,
  filled,
}: {
  status: ConsumoStatus;
  size?: number;
  className?: string;
  filled?: boolean;
}) {
  const Icon = STATUS_GLYPHS[status];
  const color = STATUS_COLORS[status];
  if (status === "CONSUMINDO") {
    return (
      <span
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke={`${color}33`} strokeWidth="2" />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 9}
            strokeDashoffset={2 * Math.PI * 9 * 0.25}
          />
        </svg>
        <Icon
          className={className}
          style={{ width: size * 0.6, height: size * 0.6, color }}
          strokeWidth={2}
          aria-hidden="true"
        />
      </span>
    );
  }
  return (
    <Icon
      className={className}
      style={{ width: size, height: size, color }}
      strokeWidth={2}
      fill={filled ? color : "none"}
      aria-hidden="true"
    />
  );
}

/** Selo de reação (👍/👎) com cor de token — usado no badge do card. */
export function ReactionGlyph({
  reacao,
  size = 14,
  className,
  asBadge,
}: {
  reacao: Reacao;
  size?: number;
  className?: string;
  asBadge?: boolean;
}) {
  const color = REACTION_COLORS[reacao];
  const Icon = reacao === "GOSTEI" ? ThumbsUp : ThumbsDown;
  return (
    <span
      className={`inline-flex items-center justify-center ${className ?? ""}`}
      style={
        asBadge
          ? {
              backgroundColor: `${color}22`,
              color,
              borderRadius: 9999,
              width: size + 8,
              height: size + 8,
            }
          : { color }
      }
      aria-hidden="true"
    >
      <Icon style={{ width: size, height: size }} strokeWidth={2.2} />
    </span>
  );
}

/** Ícone "adicionar" (estado vazio da interação rápida). */
export function AddGlyph({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <Plus
      className={className}
      style={{ width: size, height: size, color: "#9CA3AF" }}
      strokeWidth={2.2}
      aria-hidden="true"
    />
  );
}

/**
 * Conjugação por mídia (Addendum 4 §1): o valor interno é agnóstico; só o
 * rótulo muda. Filme/Série → ver; Game → jogar; Livro/HQ/Mangá/Anime → ler.
 */
export type Conjugacao = "ver" | "jogar" | "ler";

export function conjugacaoPara(mediaType: MediaType | string | undefined): Conjugacao {
  switch (mediaType) {
    case "game":
      return "jogar";
    case "book":
    case "comic":
    case "manga":
      return "ler";
    default:
      return "ver";
  }
}

export const CONJUGACAO_I18N: Record<Conjugacao, Record<ConsumoStatus, string>> = {
  ver: {
    QUERO_CONSUMIR: "queroVer",
    CONSUMINDO: "vendo",
    CONCLUIDO: "vi",
    ABANDONADO: "abandonadoVer",
  },
  jogar: {
    QUERO_CONSUMIR: "queroJogar",
    CONSUMINDO: "jogando",
    CONCLUIDO: "joguei",
    ABANDONADO: "abandonadoJogar",
  },
  ler: {
    QUERO_CONSUMIR: "queroLer",
    CONSUMINDO: "lendo",
    CONCLUIDO: "li",
    ABANDONADO: "abandonadoLer",
  },
};

/** Chave i18n do rótulo de um status para uma dada mídia. */
export function statusLabelKey(
  mediaType: MediaType | string | undefined,
  status: ConsumoStatus,
): string {
  return CONJUGACAO_I18N[conjugacaoPara(mediaType)][status];
}
