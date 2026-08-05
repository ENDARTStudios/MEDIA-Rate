"use client";

/**
 * Estado vazio "Em breve" para categorias ainda sem catálogo
 * (Livro/HQ/Mangá — Parte 3.2 e addendum §6).
 *
 * Transforma a limitação em captura de lead: ícone da categoria no accent,
 * texto de aviso e campo de e-mail opcional (waitlist). O envio chama
 * `onNotify(email)` — o WaitlistCaptureModal (addendum §6) reutiliza o
 * mesmo callback.
 */
import { useState, type FormEvent } from "react";
import { Clapperboard, Tv, Gamepad2, BookOpen, BookImage, BookMarked, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/types";
import { MEDIA_ACCENTS } from "./CategoryChip";

const ICONS: Record<MediaType, typeof Clapperboard> = {
  movie: Clapperboard,
  series: Tv,
  game: Gamepad2,
  book: BookOpen,
  comic: BookImage,
  anime: BookMarked,
};

export interface EmptyStateComingSoonProps {
  type: MediaType;
  /** Callback de captura de e-mail (waitlist). Opcional — esconde o form. */
  onNotify?: (email: string) => Promise<void> | void;
  compact?: boolean;
  className?: string;
}

export function EmptyStateComingSoon({
  type,
  onNotify,
  compact = false,
  className,
}: EmptyStateComingSoonProps) {
  const t = useTranslations("catalog");
  const Icon = ICONS[type];
  const accent = MEDIA_ACCENTS[type];
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Chaves do namespace "catalog" por tipo (filme/serie/game/livro/anime/comic). */
  const TIPO_KEY: Record<MediaType, string> = {
    movie: "filme",
    series: "serie",
    game: "game",
    book: "livro",
    comic: "comic",
    anime: "anime",
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onNotify || !email) return;
    setBusy(true);
    try {
      await onNotify(email);
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-[#2A2A3D] bg-[#12121C]/60 px-6 py-12 text-center",
        compact && "py-8",
        className,
      )}
      role="status"
      data-testid={`coming-soon-${type}`}
    >
      <div
        className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}1A`, color: accent }}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
        <Lock
          className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#05050A] p-0.5"
          style={{ color: accent }}
          aria-hidden="true"
        />
      </div>
      <p className="font-heading text-base font-semibold text-[#F5F5F7]">
        {t(TIPO_KEY[type] as "filme" | "serie" | "game" | "livro" | "comic" | "anime")} — {t("noResults")}
      </p>
      <p className="mt-1 max-w-sm text-sm text-[#6B6B85]">
        {t("comingSoonSubscribe")}
      </p>

      {onNotify && !sent && (
        <form
          onSubmit={handleSubmit}
          className="mt-5 flex w-full max-w-sm gap-2"
          data-testid="coming-soon-form"
        >
          <label htmlFor={`coming-soon-email-${type}`} className="sr-only">
            E-mail
          </label>
          <input
            id={`coming-soon-email-${type}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full rounded-md border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#6B6B85] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {busy ? "..." : "Avisar-me"}
          </button>
        </form>
      )}
      {sent && (
        <p className="mt-4 text-sm font-medium" style={{ color: "#34D399" }} role="status">
          Cadastrado! Avisaremos quando chegar.
        </p>
      )}
    </div>
  );
}
