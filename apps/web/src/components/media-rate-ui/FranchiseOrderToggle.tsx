"use client";

/**
 * Alternância de ordem de franquia (Addendum 2 §7).
 * Só é renderizada quando existe ordem cronológica para ao menos um item.
 */
import { useTranslations } from "next-intl";

export interface FranchiseOrderToggleProps {
  order: "lancamento" | "cronologica";
  onChange: (order: "lancamento" | "cronologica") => void;
}

export function FranchiseOrderToggle({ order, onChange }: FranchiseOrderToggleProps) {
  const t = useTranslations("metadados");
  return (
    <div
      className="inline-flex rounded-lg border border-surface-border overflow-hidden"
      role="group"
      aria-label={t("orderToggle")}
    >
      {(["lancamento", "cronologica"] as const).map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={order === o}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            order === o
              ? "bg-accent-indigo text-accent-indigo-foreground"
              : "bg-surface-card text-fg-secondary hover:text-fg-primary"
          }`}
        >
          {o === "lancamento" ? t("orderRelease") : t("orderChronological")}
        </button>
      ))}
    </div>
  );
}
