"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { MediaType } from "@/lib/types";

const TYPES: { value: MediaType; labelKey: string }[] = [
  { value: "movie", labelKey: "filme" },
  { value: "series", labelKey: "serie" },
  { value: "game", labelKey: "game" },
  { value: "book", labelKey: "livro" },
];

const SORT_OPTIONS = [
  { value: "score", labelKey: "sortScore" },
  { value: "year", labelKey: "sortAno" },
  { value: "title", labelKey: "sortTitulo" },
];

export function CatalogFiltersClient() {
  const t = useTranslations("catalog");
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const type = sp.get("type") ?? "";
  const sort = sp.get("sort") ?? "";
  const query = sp.get("q") ?? "";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [sp, router, pathname]
  );

  const clearAll = () => router.replace(pathname);

  const activeCount = [type, sort, query].filter(Boolean).length;

  return (
    <aside className="w-full lg:w-60 shrink-0 space-y-5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-100">Filtros{activeCount > 0 ? ` (${activeCount})` : ""}</span>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs text-accent-400 hover:text-accent-300">
            Limpar todos
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">{t("search")}</label>
        <input
          type="search"
          value={query}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder={t("search")}
          className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">{t("all")}</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setParam("type", "")}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${!type ? "bg-accent-600 text-white" : "bg-surface-card text-gray-400 hover:text-gray-200"}`}
          >
            {t("all")}
          </button>
          {TYPES.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => setParam("type", type === value ? "" : value)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${type === value ? "bg-accent-600 text-white" : "bg-surface-card text-gray-400 hover:text-gray-200"}`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">{t("sort")}</label>
        <select
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
          className="w-full px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          <option value="">{t("sortScore")}</option>
          {SORT_OPTIONS.map(({ value, labelKey }) => (
            <option key={value} value={value}>{t(labelKey)}</option>
          ))}
        </select>
      </div>
    </aside>
  );
}
