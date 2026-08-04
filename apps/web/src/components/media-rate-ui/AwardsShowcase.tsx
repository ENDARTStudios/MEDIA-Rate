"use client";

/**
 * Vitrine de prêmios (Addendum 2 §6).
 *
 * - Troféu dourado (vencedor) / contorno prata (indicado).
 * - Tooltip com categoria completa + ano + organização.
 * - Ordenação: vencidos primeiro, depois indicações; max 5 + "+X".
 */
import { useState } from "react";
import { useTranslations } from "next-intl";

export interface Award {
  name: string;
  category?: string;
  year: number;
  won: boolean;
  organization: string;
}

export interface AwardsShowcaseProps {
  awards: Award[];
  className?: string;
}

const MAX_VISIVEIS = 5;

export function AwardsShowcase({ awards, className }: AwardsShowcaseProps) {
  const t = useTranslations("metadados");
  const [expanded, setExpanded] = useState(false);

  if (awards.length === 0) {
    return (
      <p className={`text-sm text-[#6B6B85] ${className ?? ""}`} role="status">
        {t("awardsNone")}
      </p>
    );
  }

  const ordenados = [...awards].sort((a, b) => {
    if (a.won !== b.won) return a.won ? -1 : 1;
    return b.year - a.year;
  });
  const visiveis = expanded ? ordenados : ordenados.slice(0, MAX_VISIVEIS);
  const ocultos = ordenados.length - visiveis.length;

  return (
    <div className={className} data-testid="awards-showcase">
      <div className="flex flex-wrap items-center gap-2">
        {visiveis.map((award) => (
          <span
            key={`${award.name}-${award.year}-${award.category ?? ""}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A3D] bg-[#12121C] px-2.5 py-1 text-xs text-[#A0A0B8]"
            title={`${award.organization} · ${award.name}${award.category ? ` · ${award.category}` : ""} · ${award.year} · ${award.won ? t("won") : t("nominated")}`}
          >
            <span aria-hidden="true">{award.won ? "🏆" : "🥈"}</span>
            <span className="font-medium text-[#F5F5F7]">{award.name}</span>
            <span className="tabular-nums text-[#6B6B85]">{award.year}</span>
          </span>
        ))}
        {ocultos > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-[#2A2A3D] px-2.5 py-1 text-xs text-[#818CF8] hover:text-[#A5B4FC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
          >
            +{ocultos} {t("moreAwards")}
          </button>
        )}
      </div>
    </div>
  );
}
