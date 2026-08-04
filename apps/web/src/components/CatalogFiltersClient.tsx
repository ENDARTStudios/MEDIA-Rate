"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

const SORT_OPTIONS = [
  { value: "score", labelKey: "sortScore" },
  { value: "year", labelKey: "sortAno" },
  { value: "title", labelKey: "sortTitulo" },
];

export function CatalogFiltersClient() {
  const t = useTranslations("catalog");
  const tf = useTranslations("catalogFilters");
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const type = sp.get("type") ?? "";
  const sort = sp.get("sort") ?? "";
  const query = sp.get("q") ?? "";
  const anoMin = sp.get("anoMin") ?? "";
  const anoMax = sp.get("anoMax") ?? "";
  const scoreMin = sp.get("scoreMin") ?? "";
  const scoreMax = sp.get("scoreMax") ?? "";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [sp, router, pathname],
  );

  const clearAll = () => router.replace(pathname);

  const activeCount = [type, sort, query, anoMin, anoMax, scoreMin, scoreMax].filter(
    Boolean,
  ).length;

  return (
    <aside className="w-full lg:w-60 shrink-0 space-y-5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#EDE7DC]">
          {tf("filters")}
          {activeCount > 0 ? ` (${activeCount})` : ""}
        </span>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs text-[#818CF8] hover:text-[#A5B4FC]">
            {tf("clearAll")}
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">{t("search")}</label>
        <input
          type="search"
          value={query}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder={t("search")}
          className="w-full px-3 py-2 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
        />
      </div>

      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">{t("sort")}</label>
        <select
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
          className="w-full px-3 py-2 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
        >
          <option value="">{t("sortScore")}</option>
          {SORT_OPTIONS.map(({ value, labelKey }) => (
            <option key={value} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro avançado colapsável (Parte 3.2): ano + faixa de score. */}
      <div className="border-t border-[#1C1C2E] pt-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="flex w-full items-center justify-between text-xs font-semibold text-[#9CA3AF] hover:text-[#EDE7DC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] rounded"
        >
          <span>Filtro avançado</span>
          <svg
            className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {advancedOpen && (
          <div className="mt-3 space-y-3">
            <div>
              <span className="block text-[11px] text-[#6B7280] mb-1.5">Ano</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={anoMin}
                  onChange={(e) => setParam("anoMin", e.target.value)}
                  placeholder="De"
                  aria-label="Ano mínimo"
                  className="w-full px-2 py-1.5 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                />
                <span className="text-[#6B7280]">–</span>
                <input
                  type="number"
                  value={anoMax}
                  onChange={(e) => setParam("anoMax", e.target.value)}
                  placeholder="Até"
                  aria-label="Ano máximo"
                  className="w-full px-2 py-1.5 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                />
              </div>
            </div>

            <div>
              <span className="block text-[11px] text-[#6B7280] mb-1.5">MEDIA Score (0–100)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={scoreMin}
                  onChange={(e) => setParam("scoreMin", e.target.value)}
                  placeholder="Mín."
                  aria-label="Score mínimo"
                  className="w-full px-2 py-1.5 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                />
                <span className="text-[#6B7280]">–</span>
                <input
                  type="number"
                  value={scoreMax}
                  onChange={(e) => setParam("scoreMax", e.target.value)}
                  placeholder="Máx."
                  aria-label="Score máximo"
                  className="w-full px-2 py-1.5 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#6B7280]">
                Gênero e "somente com crítica" chegam quando os dados do catálogo cobrirem (decisão
                documentada).
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
