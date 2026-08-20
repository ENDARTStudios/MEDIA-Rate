"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

const ORDER: MediaType[] = ["movie", "series", "game", "book", "comic"];

/**
 * T370 (D-334/D-340) — os 5 ícones canônicos voltam, REMODELADOS:
 * line/stroke fino, 48px, cinza → glow rose no hover/focus, integrados à
 * hero (não como cluster grotesco). Cada um navega para /catalog?type=X.
 */
export function CategoryIconRow() {
  const t = useTranslations("catalog");

  return (
    <nav aria-label={t("catalogAria")} className="mt-8" data-testid="category-icon-row">
      <ul className="flex items-center gap-6">
        {ORDER.map((type) => {
          const token = CATEGORY_TOKENS[type];
          const Icon = token.icon;
          return (
            <li key={type}>
              <Link
                href={`/catalog?type=${type}`}
                className="group flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(129,140,248,0.12)] text-[#80809B] transition-all duration-200 hover:border-[#E11D48]/50 hover:text-[#E11D48] hover:shadow-[0_0_16px_rgba(225,29,72,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"
                aria-label={t(token.labelKey)}
              >
                <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
