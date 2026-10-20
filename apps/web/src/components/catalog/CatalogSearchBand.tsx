"use client";

/**
 * Faixa de busca + ordenação do catálogo (conceito v1, §3 blocos 1–2).
 *
 * Por que ela existe separada da sidebar: no produto, busca e ordenação viviam
 * DENTRO de `CatalogFiltersClient`, que é `hidden lg:block` — no 375 elas só
 * apareciam depois de abrir o drawer de filtros. O conceito põe as duas **acima
 * dos chips**, visíveis em qualquer largura, porque são a primeira intenção de
 * quem chega ("achar uma coisa") e não um filtro avançado.
 *
 * A lógica de URL é a mesma de antes, sem duplicar comportamento: o input é
 * estado local (o `router.replace` é assíncrono e "voltaria" o valor a cada
 * tecla) e vira `?q=` só depois do debounce; o select escreve `?sort=`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { SortDropdown } from "./SortDropdown";

const SEARCH_DEBOUNCE_MS = 300;

const SORT_OPTIONS = [
  { value: "score", labelKey: "sortScore" },
  { value: "year", labelKey: "sortAno" },
  { value: "title", labelKey: "sortTitulo" },
] as const;

export function CatalogSearchBand() {
  const t = useTranslations("catalog");
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? "";

  const [draftQuery, setDraftQuery] = useState(query);
  const lastCommitted = useRef(query);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [sp, router, pathname],
  );

  // Hidrata o draft quando a URL muda por fora (back/forward/link) — mas nunca
  // sobrescreve digitação em andamento (draft ≠ último commitado).
  useEffect(() => {
    if (query !== lastCommitted.current) {
      lastCommitted.current = query;
      setDraftQuery(query);
    }
  }, [query]);

  useEffect(() => {
    if (draftQuery === lastCommitted.current) return;
    const timer = setTimeout(() => {
      lastCommitted.current = draftQuery;
      setParam("q", draftQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draftQuery, setParam]);

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor="catalog-search" className="sr-only">
          {t("search")}
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
          aria-hidden="true"
        />
        <input
          id="catalog-search"
          type="search"
          value={draftQuery}
          onChange={(e) => setDraftQuery(e.target.value)}
          placeholder={t("search")}
          data-testid="catalog-search"
          className="min-h-[44px] w-full rounded-lg border border-surface-border bg-surface-card py-2.5 pl-10 pr-3 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo"
        />
      </div>

      <div className="flex items-center gap-2">
        <SortDropdown
          valor={sort}
          rotulo={t("sort")}
          opcoes={[
            { value: "", label: t("sortRelevancia") },
            ...SORT_OPTIONS.map(({ value, labelKey }) => ({ value, label: t(labelKey) })),
          ]}
          aoEscolher={(valor) => setParam("sort", valor)}
        />
      </div>
    </div>
  );
}
