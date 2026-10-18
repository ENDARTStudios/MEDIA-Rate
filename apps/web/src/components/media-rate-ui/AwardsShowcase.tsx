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
      <p className={`text-sm text-fg-muted ${className ?? ""}`} role="status">
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
            className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card px-2.5 py-1 text-xs text-fg-secondary"
            title={`${award.organization} · ${award.name}${award.category ? ` · ${award.category}` : ""} · ${award.year} · ${award.won ? t("won") : t("nominated")}`}
          >
            <span aria-hidden="true">{award.won ? "🏆" : "🥈"}</span>
            <span className="font-medium text-fg-primary">{award.name}</span>
            {/* T177: organização visível — Emmy e Globo podem ter o mesmo nome
                de categoria ("Melhor Série Dramática") e pareciam duplicados. */}
            <span className="text-fg-muted">{award.organization}</span>
            <span className="tabular-nums text-fg-muted">{award.year}</span>
          </span>
        ))}
        {ocultos > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-surface-border px-2.5 py-1 text-xs text-accent-indigo hover:text-accent-indigo-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo"
          >
            +{ocultos} {t("moreAwards")}
          </button>
        )}
      </div>
    </div>
  );
}
