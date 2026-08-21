"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

const ORDER: MediaType[] = ["movie", "series", "game", "book", "comic"];

/**
 * T382 (D-350) — os 5 ícones canônicos remodelados com a COR do token de cada
 * tipo (filme indigo, série sky, game emerald, livro âmbar, quadrinhos rosa),
 * tiles de 64px com glow + rótulo i18n + lift no hover. Cada tile ancora no
 * catálogo filtrado (/catalog?type=…).
 */
export function CategoryIconRow() {
  const t = useTranslations("catalog");

  return (
    <nav aria-label={t("catalogAria")} className="mt-8" data-testid="category-icon-row">
      <ul className="flex flex-wrap items-start gap-x-5 gap-y-4">
        {ORDER.map((type) => {
          const token = CATEGORY_TOKENS[type];
          const Icon = token.icon;
          const label = t(token.labelKey.replace(/^catalog\./, ""));
          // T383b: 5º tile (HQs & Mangás) em duo-tone rosa→roxo.
          const duo = type === "comic";
          const bg = duo
            ? "linear-gradient(135deg, rgba(244,114,182,0.16), rgba(167,139,250,0.16))"
            : `${token.color}14`;
          const glow = duo
            ? "0 0 22px rgba(244,114,182,0.16), 0 0 22px rgba(167,139,250,0.16)"
            : `0 0 22px ${token.color}1f`;
          const border = duo ? "rgba(216,143,236,0.45)" : `${token.color}40`;
          return (
            <li key={type}>
              <Link
                href={`/catalog?type=${type}`}
                className="group flex flex-col items-center gap-2 focus-visible:outline-none"
                aria-label={label}
              >
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1"
                  style={{
                    color: duo ? "#E4B6E8" : token.color,
                    borderColor: border,
                    backgroundImage: bg,
                    boxShadow: glow,
                  }}
                >
                  <Icon className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span
                  className="text-xs font-medium transition-colors"
                  style={{ color: duo ? "#E4B6E8" : token.color }}
                >
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
