"use client";

/**
 * Barra de filtro sticky do catálogo (Parte 3.2) — chips por categoria com
 * contagem REAL da API (total por tipo). Clicar define ?type= na URL.
 */
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getCatalog } from "@/lib/api";
import { CategoryChip } from "@/components/media-rate-ui/CategoryChip";
import type { MediaType } from "@/lib/types";

// D-233/T231: "anime" não é categoria — animação japonesa é série;
// mangá (quadrinho japonês) é categoria própria.
const TYPES: MediaType[] = ["movie", "series", "game", "book", "comic", "manga"];

export function CatalogTypeBar() {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const activeType = (sp.get("type") as MediaType | null) ?? undefined;

  const { data: counts } = useQuery({
    queryKey: ["catalog-type-counts"],
    queryFn: async () => {
      const results = await Promise.all(
        TYPES.map(async (type) => {
          const data = await getCatalog({ type, limit: 1 });
          return [type, data?.total ?? 0] as const;
        }),
      );
      return Object.fromEntries(results) as Record<MediaType, number>;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  function setType(type?: string) {
    const params = new URLSearchParams(sp.toString());
    if (type) params.set("type", type);
    else params.delete("type");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      className="sticky top-16 z-sticky -mx-4 mb-6 border-b border-[#2A2A3D] bg-[#05050A]/90 px-4 py-3 backdrop-blur-sm"
      role="navigation"
      aria-label="Filtrar por tipo de mídia"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip
          type="movie"
          count={counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined}
          active={!activeType}
          onClick={() => setType(undefined)}
          label={t("all")}
        />
        {TYPES.map((type) => (
          <CategoryChip
            key={type}
            type={type}
            count={counts?.[type]}
            active={activeType === type}
            onClick={() => setType(type)}
          />
        ))}
      </div>
    </div>
  );
}
