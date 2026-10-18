/**
 * Prova social da Home (Parte 3.1) — contadores REAIS vindos da API.
 *
 * - Títulos no catálogo: total real da listagem (/api/v1/midias).
 * - Fontes de avaliação: DISTINTAS fontes ativas (derivadas de
 *   PESOS_POR_TIPO_WEB + FONTES_WEB).
 * - Categorias: T394 — 6 tipos ativos (Filme/Série/Game/Livro/HQ/Mangá).
 *
 * T208: os números são animados por `CountUpValue` (ilha client mínima, abaixo da
 * dobra). O HTML do servidor continua saindo com o valor final formatado — o
 * contador só assume depois da hidratação e apenas quando entra em viewport, e
 * nunca com `prefers-reduced-motion`. A formatação passou a usar o locale da
 * rota (antes era `toLocaleString("pt-BR")` fixo, errado em en-US/es-ES).
 */
import { getCatalog } from "@/lib/api";
import { NUM_FONTES_ATIVAS } from "@/lib/sources";
import { getTranslations } from "next-intl/server";
import { CountUpValue } from "@/components/media-rate-ui/CountUpValue";

// T394: 6 tipos cobertos (F13 destravou Livro/HQ/Mangá).
const CATEGORIAS_COBERTAS = ["movie", "series", "game", "book", "comic", "manga"] as const;

export async function HomeStats() {
  const t = await getTranslations("home");
  const data = await getCatalog({ limit: 1 });
  const totalTitulos = data?.total ?? null;

  const stats: { value: number; label: string }[] = [];
  if (totalTitulos != null) {
    // T: rótulos via i18n (EN: 'titles in catalog'; ES: 'títulos en el catálogo').
    stats.push({ value: totalTitulos, label: t("statsTitulos") });
  }
  stats.push({ value: NUM_FONTES_ATIVAS, label: t("statsFontes") });
  stats.push({ value: CATEGORIAS_COBERTAS.length, label: t("statsCategorias") });

  return (
    <section className="px-4 pb-4" aria-label={t("statsAria")}>
      <dl className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-12 gap-y-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <dd className="font-heading text-3xl font-bold tabular-nums text-accent-indigo">
              <CountUpValue value={s.value} />
            </dd>
            {/* AA: #6B6B85 (3,99:1 sobre #05050A) reprovava para texto normal;
                #85859F é o muted do design system (5,3:1) — ver design-tokens. */}
            <dt className="text-xs uppercase tracking-widest text-fg-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
