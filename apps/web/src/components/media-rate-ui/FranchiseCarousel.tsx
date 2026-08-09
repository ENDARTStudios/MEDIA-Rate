"use client";

/**
 * Carrossel de franquia/universo (Addendum 2 §7) — itens de qualquer mídia.
 *
 * - Toggle de ordem (lançamento vs. cronológica) só quando houver dado
 *   cronológico em ao menos um item.
 * - Item atual com selo "Você está aqui".
 * - MediaCard reaproveitado (accent de categoria distingue as mídias).
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { FranchiseOrderToggle } from "./FranchiseOrderToggle";
import type { MediaType } from "@/lib/types";

export interface FranquiaItem {
  midiaId: string;
  tipo: MediaType;
  titulo: string;
  ano: number | null;
  posterUrl: string | null;
  score: number | null;
  /** Ordem cronológica dos eventos na história (null = sem dado). */
  ordemCronologica: number | null;
  /** Ordem de lançamento (sempre presente). */
  ordemLancamento: number;
}

export interface FranchiseCarouselProps {
  items: FranquiaItem[];
  currentMediaId: string;
  className?: string;
}

export function FranchiseCarousel({ items, currentMediaId, className }: FranchiseCarouselProps) {
  const t = useTranslations("metadados");
  const hasChronological = useMemo(() => items.some((i) => i.ordemCronologica != null), [items]);
  const [order, setOrder] = useState<"lancamento" | "cronologica">("lancamento");

  if (items.length === 0) {
    return (
      <p className={`text-sm text-[#6B6B85] ${className ?? ""}`} role="status">
        {t("franchiseNone")}
      </p>
    );
  }

  const ordenados = [...items].sort((a, b) => {
    if (order === "cronologica" && hasChronological) {
      const ac = a.ordemCronologica ?? Number.MAX_SAFE_INTEGER;
      const bc = b.ordemCronologica ?? Number.MAX_SAFE_INTEGER;
      if (ac !== bc) return ac - bc;
    }
    return a.ordemLancamento - b.ordemLancamento;
  });

  return (
    <div className={className} data-testid="franchise-carousel">
      <div className="mb-3 flex items-center justify-between">
        {hasChronological ? (
          <FranchiseOrderToggle order={order} onChange={setOrder} />
        ) : (
          <span className="text-xs text-[#6B6B85]">{t("orderRelease")}</span>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
        {ordenados.map((item) => {
          const media: MediaItem = {
            id: item.midiaId,
            titulo: item.titulo,
            tipo:
              item.tipo === "movie"
                ? "FILME"
                : item.tipo === "series"
                  ? "SERIE"
                  : item.tipo === "game"
                    ? "GAME"
                    : item.tipo === "comic"
                      ? "COMIC"
                      : item.tipo === "manga"
                        ? "MANGA"
                        : "LIVRO",
            ano_lancamento: item.ano,
            imagem_url: item.posterUrl,
            score: item.score,
          };
          const atual = item.midiaId === currentMediaId;
          return (
            <div key={item.midiaId} className="relative flex-shrink-0 w-[160px] snap-start">
              <Link
                href={`/media/${item.midiaId}`}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] rounded-md"
              >
                <MediaCard media={media} />
              </Link>
              {atual && (
                <span className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#E11D48] px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  {t("youAreHere")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
