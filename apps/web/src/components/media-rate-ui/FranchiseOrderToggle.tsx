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
      className="inline-flex rounded-lg border border-[#2A2A3D] overflow-hidden"
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
              ? "bg-[#818CF8] text-[#0F172A]"
              : "bg-[#12121C] text-[#A0A0B8] hover:text-[#F5F5F7]"
          }`}
        >
          {o === "lancamento" ? t("orderRelease") : t("orderChronological")}
        </button>
      ))}
    </div>
  );
}
