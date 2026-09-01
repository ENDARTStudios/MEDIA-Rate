"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";

const SORT_OPTIONS = [
  { value: "score", labelKey: "sortScore" },
  { value: "year", labelKey: "sortAno" },
  { value: "title", labelKey: "sortTitulo" },
];

/** Debounce da busca textual (T237): sem ele, cada tecla vira um
 * router.replace e a digitação rápida perde caracteres. */
const SEARCH_DEBOUNCE_MS = 300;

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
  const genero = sp.get("genero") ?? "";
  const comCritica = sp.get("com_critica") === "true";

  // T237: o input de busca é 100% ESTADO LOCAL — nunca controlado pela URL
  // diretamente (o router.replace é assíncrono e "voltaria" o valor a cada
  // tecla). O estado local vira URL apenas após o debounce.
  const [draftQuery, setDraftQuery] = useState(query);
  const lastCommitted = useRef(query);

  // Hidrata o draft quando a URL muda por fora (back/forward/link) — mas
  // NUNCA sobrescreve digitação em andamento (draft ≠ último commitado).
  useEffect(() => {
    if (query !== lastCommitted.current) {
      lastCommitted.current = query;
      setDraftQuery(query);
    }
  }, [query]);

  // Debounce: após pausa na digitação, commita o termo para a URL (que
  // alimenta o react-query do catálogo). Atrasos extras (AbortController)
  // não são necessários: a URL só muda após o debounce, então não há
  // respostas fora de ordem sobrescrevendo o input.
  useEffect(() => {
    if (draftQuery === lastCommitted.current) return;
    const timer = setTimeout(() => {
      lastCommitted.current = draftQuery;
      setParam("q", draftQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draftQuery]);

  const { data: generos } = useQuery({
    queryKey: ["generos"],
    queryFn: async () =>
      (await api.get<{ id: number; nome: string; slug: string; total_midias: number }[]>(
        "/api/v1/midias/generos",
      )) ?? [],
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

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
          value={draftQuery}
          onChange={(e) => setDraftQuery(e.target.value)}
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
          <span>{tf("advancedFilters")}</span>
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
              <span className="block text-xs text-[#6B7280] mb-1.5">{tf("anoLabel")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={anoMin}
                  onChange={(e) => setParam("anoMin", e.target.value)}
                  placeholder={tf("anoMin")}
                  aria-label={tf("anoMin")}
                  className="w-full px-2 py-1.5 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                />
                <span className="text-[#6B7280]">–</span>
                <input
                  type="number"
                  value={anoMax}
                  onChange={(e) => setParam("anoMax", e.target.value)}
                  placeholder={tf("anoMax")}
                  aria-label={tf("anoMax")}
                  className="w-full px-2 py-1.5 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs text-[#6B7280] mb-1.5">MEDIA Score (0–100)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={scoreMin}
                  onChange={(e) => setParam("scoreMin", e.target.value)}
                  placeholder={tf("scoreMin")}
                  aria-label={tf("scoreMin")}
                  className="w-full px-2 py-1.5 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                />
                <span className="text-[#6B7280]">–</span>
                <input
                  type="number"
                  value={scoreMax}
                  onChange={(e) => setParam("scoreMax", e.target.value)}
                  placeholder={tf("scoreMax")}
                  aria-label={tf("scoreMax")}
                  className="w-full px-2 py-1.5 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                />
              </div>
            </div>
            <div>
              <span className="block text-xs text-[#6B7280] mb-1.5">{tf("genero")}</span>
              <select
                value={genero}
                onChange={(e) => setParam("genero", e.target.value)}
                aria-label={tf("genero")}
                className="w-full px-2 py-1.5 bg-[#11111E] border-[#1C1C2E] rounded-md text-sm text-[#EDE7DC] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
              >
                <option value="">{tf("todosGeneros")}</option>
                {(generos ?? []).map((g) => (
                  <option key={g.id} value={g.slug}>
                    {g.nome} ({g.total_midias})
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-[#6B7280]">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={comCritica}
                    onChange={(e) => setParam("com_critica", e.target.checked ? "true" : "")}
                    className="mt-0.5 accent-[#818CF8]"
                  />
                  <span>{tf("somenteCritica")}</span>
                </label>
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
