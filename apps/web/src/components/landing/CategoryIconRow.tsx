"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

// T394: 6 tipos ativos (mangá separado de HQs).
const ORDER: MediaType[] = ["movie", "series", "game", "book", "comic", "manga"];

/**
 * T415 (D-390, ordem do Operador) — os 6 tiles do hero agora NAVEGAM para a
 * categoria (/catalog?type=X), em vez de trocar um showcase rotativo (removido).
 */
export function CategoryIconRow() {
  const t = useTranslations("catalog");

  return (
    <nav aria-label={t("catalogAria")} className="mt-8" data-testid="category-icon-row">
      <ul className="flex flex-wrap items-start justify-center gap-x-4 gap-y-4">
        {ORDER.map((type) => {
          const token = CATEGORY_TOKENS[type];
          const Icon = token.icon;
          const label = t(token.labelKey.replace(/^catalog\./, ""));
          return (
            <li key={type}>
              <Link
                href={`/catalog?type=${type}`}
                aria-label={label}
                className="group flex flex-col items-center gap-2 focus-visible:outline-none"
              >
                <span
                  className="flex h-24 w-24 items-center justify-center rounded-2xl border transition-all duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1"
                  style={{
                    color: token.color,
                    borderColor: `${token.color}40`,
                    backgroundColor: `${token.color}14`,
                    boxShadow: `0 0 22px ${token.color}1f`,
                  }}
                >
                  <Icon className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="text-xs font-medium transition-colors" style={{ color: token.color }}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
