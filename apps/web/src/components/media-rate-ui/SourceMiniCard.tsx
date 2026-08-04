"use client";

/**
 * Mini-card de fonte de avaliação (Parte 3.3 — transparência total).
 *
 * Mostra nome da fonte, classificação (Crítica #38BDF8 / Público #E11D48),
 * nota original e nota normalizada (0–100), com link quando disponível.
 */
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface SourceMiniCardProps {
  name: string;
  /** Nota original na escala da fonte (ex.: 8.5 em 0–10, 92 em 0–100). */
  ratingOriginal: number | null;
  /** Nota normalizada 0–100 (ou null quando indisponível). */
  ratingNormalized: number | null;
  classification?: "critica" | "publico";
  url?: string | null;
  className?: string;
}

const CLASS_COLOR: Record<NonNullable<SourceMiniCardProps["classification"]>, string> = {
  critica: "#38BDF8",
  publico: "#E11D48",
};

export function SourceMiniCard({
  name,
  ratingOriginal,
  ratingNormalized,
  classification,
  url,
  className,
}: SourceMiniCardProps) {
  const t = useTranslations("catalog");

  const inner = (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-[#2A2A3D] bg-[#12121C] px-3 py-2.5 transition-colors hover:border-[#3A3A52]",
        className,
      )}
      data-testid={`source-mini-card-${name.toLowerCase()}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[#F5F5F7]">{name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {classification ? (
            <span
              className="rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: `${CLASS_COLOR[classification]}1F`,
                color: CLASS_COLOR[classification],
              }}
            >
              {classification === "critica" ? t("criticsBar") : t("audienceBar")}
            </span>
          ) : null}
          {ratingNormalized != null && (
            <span className="text-[11px] text-[#6B6B85]">{ratingNormalized}/100</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span className="block text-sm font-bold tabular-nums text-[#F5F5F7]">
          {ratingOriginal != null ? ratingOriginal : "—"}
        </span>
        <span className="block text-[10px] text-[#6B6B85]">orig.</span>
      </div>
    </div>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05050A]"
        aria-label={`${name} — ${t("sources")}`}
      >
        {inner}
        <span className="sr-only">(abre em nova aba)</span>
      </a>
    );
  }

  return inner;
}
