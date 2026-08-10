"use client";

/**
 * Card bloqueado inline para categorias futuras (addendum §6).
 *
 * Mesma estrutura visual do MediaCard (pôster/capa + rodapé), mas com blur
 * sobre a capa, cadeado central e "Em breve" no lugar do score. O clique
 * abre o WaitlistCaptureModal (captura de lead) em vez de navegar para
 * uma página vazia.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import type { MediaType } from "@/lib/types";
import { MEDIA_ACCENTS } from "@/components/media-rate-ui/CategoryChip";
import { WaitlistCaptureModal } from "@/components/media-rate-ui/WaitlistCaptureModal";

// T254: chaves i18n dos rótulos de categoria (plurais — catalog.filme/...).
const CATEGORY_KEY: Record<MediaType, string> = {
  movie: "filme",
  series: "serie",
  game: "game",
  book: "livro",
  comic: "comic",
  manga: "manga",
};

/** Chave da lista de variações por tipo (arrays i18n, via t.raw). */
const VARIANTE_KEY: Record<MediaType, string> = {
  movie: "variant_movie",
  series: "variant_series",
  game: "variant_game",
  book: "variant_book",
  comic: "variant_comic",
  manga: "variant_manga",
};

export interface LockedComingSoonCardProps {
  type: MediaType;
  /** Variação visual do card (0–4) — evita cards idênticos no carrossel. */
  variante?: number;
  onNotify?: (email: string) => Promise<void> | void;
}

export function LockedComingSoonCard({ type, variante = 0, onNotify }: LockedComingSoonCardProps) {
  const t = useTranslations("catalog");
  const [modalOpen, setModalOpen] = useState(false);
  const accent = MEDIA_ACCENTS[type];
  const categoria = t(CATEGORY_KEY[type]);
  const variacoes = (t.raw(VARIANTE_KEY[type]) as string[]) ?? [];
  const rotulo = variacoes[variante % Math.max(variacoes.length, 1)] ?? categoria;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="group block w-full rounded-md border border-[#2A2A3D] bg-[#12121C] text-left overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
        aria-label={`${categoria} — ${t("comingSoonTag")}`}
        data-testid={`locked-card-${type}`}
      >
        <div className="aspect-[2/3] bg-[#1B1B2C] relative overflow-hidden">
          {/* Simula capa genérica com o accent da categoria (ângulo varia por card). */}
          <div
            className="absolute inset-0 opacity-25 blur-[4px]"
            style={{
              background: `linear-gradient(${135 + variante * 30}deg, ${accent}66 0%, transparent 60%)`,
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            aria-hidden="true"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accent}1F`, color: accent }}
            >
              <Lock className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#A0A0B8]">
              {/* T261: badge do cadeado usa copy coming-soon ('Em breve'/
                  'Coming soon'/'Próximamente'), nunca 'noResults' (copy de
                  busca vazia). */}
              {t("comingSoonTag")}
            </span>
            <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-[#F5F5F7]">
              {rotulo}
            </span>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-heading text-sm font-medium text-[#F5F5F7]">
            {categoria}
          </h3>
          <p className="text-xs text-[#6B6B85] mt-0.5">{t("comingSoonTap")}</p>
        </div>
      </button>

      <WaitlistCaptureModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        categoryLabel={categoria}
        onNotify={onNotify}
      />
    </>
  );
}
