"use client";

import { useTranslations } from "next-intl";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

// T394: 6 tipos ativos (mangá separado de HQs).
const ORDER: MediaType[] = ["movie", "series", "game", "book", "comic", "manga"];

/**
 * T394 (D-376) — os 6 ícones protagonistas do hero: tiles de 96px que, ao
 * serem clicados, TROCAM o showcase (ScoreShowcase) para o top-1 da categoria.
 * O tile ativo ganha ring + lift; os demais só glow. A navegação ao catálogo
 * segue disponível pelo nav global e pelos carrosséis abaixo.
 */
export function CategoryIconRow({
  activeType,
  onSelect,
}: {
  activeType: MediaType | null;
  onSelect: (type: MediaType) => void;
}) {
  const t = useTranslations("catalog");

  return (
    <nav aria-label={t("catalogAria")} className="mt-8" data-testid="category-icon-row">
      <ul className="flex flex-wrap items-start gap-x-4 gap-y-4">
        {ORDER.map((type) => {
          const token = CATEGORY_TOKENS[type];
          const Icon = token.icon;
          const label = t(token.labelKey.replace(/^catalog\./, ""));
          const active = type === activeType;
          return (
            <li key={type}>
              <button
                type="button"
                onClick={() => onSelect(type)}
                aria-label={label}
                aria-pressed={active}
                className="group flex flex-col items-center gap-2 focus-visible:outline-none"
              >
                <span
                  className={`flex h-24 w-24 items-center justify-center rounded-2xl border transition-all duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 ${
                    active ? "-translate-y-1 ring-2" : ""
                  }`}
                  style={{
                    color: token.color,
                    borderColor: active ? token.color : `${token.color}40`,
                    backgroundColor: `${token.color}14`,
                    boxShadow: active ? `0 0 28px ${token.color}33` : `0 0 22px ${token.color}1f`,
                    // ring color (Tailwind ring-* não cobre cores dinâmicas)
                    outlineColor: token.color,
                  }}
                >
                  <Icon className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span
                  className={`text-xs font-medium transition-colors ${
                    active ? "font-semibold" : ""
                  }`}
                  style={{ color: token.color }}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
