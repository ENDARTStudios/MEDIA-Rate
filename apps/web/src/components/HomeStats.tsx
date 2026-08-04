/**
 * Prova social da Home (Parte 3.1) — contadores REAIS vindos da API.
 *
 * - Títulos no catálogo: total real da listagem (/api/v1/midias).
 * - Fontes agregadas: contagem do registro de fontes do frontend (FONTES_WEB).
 */
import { getCatalog } from "@/lib/api";
import { FONTES_WEB } from "@/lib/source-registry";

export async function HomeStats() {
  const data = await getCatalog({ limit: 1 });
  const totalTitulos = data?.total ?? null;

  const stats: { value: string; label: string }[] = [];
  if (totalTitulos != null) {
    stats.push({ value: totalTitulos.toLocaleString("pt-BR"), label: "títulos no catálogo" });
  }
  stats.push({ value: String(Object.keys(FONTES_WEB).length), label: "fontes de avaliação" });
  stats.push({ value: "3", label: "categorias cobertas" });

  return (
    <section className="px-4 pb-4" aria-label="Estatísticas do catálogo">
      <dl className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-12 gap-y-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <dd className="font-heading text-3xl font-bold tabular-nums text-[#818CF8]">
              {s.value}
            </dd>
            <dt className="text-xs uppercase tracking-widest text-[#6B6B85]">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
