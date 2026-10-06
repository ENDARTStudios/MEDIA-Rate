"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import type { RelacionadaFicha } from "@/lib/types";

/**
 * T163 (Onda B): conteúdo relacionado do grafo RelacaoObra — rótulo traduzido
 * por tipo de relação + nota editorial. MESMO_GENERO é fallback de descobertas
 * (T201), não curadoria editorial — nunca aparece aqui.
 */
const RELACAO_CURADA = new Set([
  "ADAPTACAO_DE",
  "SEQUENCIA_DE",
  "PREQUELA_DE",
  "SPINOFF_DE",
  "MESMO_UNIVERSO",
  "MESMA_HISTORIA_REAL",
]);

export function RelacionadasSection({ relacoes }: { relacoes: RelacionadaFicha[] }) {
  const t = useTranslations("metadados");
  const curadas = (relacoes ?? []).filter((r) => RELACAO_CURADA.has(r.tipoRelacao));
  if (curadas.length === 0) return null;

  return (
    <ul className="space-y-2" data-testid="ficha-relacionadas">
      {curadas.map((r) => (
        <li
          key={`${r.midiaId}-${r.tipoRelacao}`}
          className="text-sm flex flex-wrap items-baseline gap-x-2"
        >
          <span className="px-2 py-0.5 rounded-full bg-[#818CF8]/15 text-[#818CF8] text-xs font-medium shrink-0">
            {t(`relacaoTipo.${r.tipoRelacao}`)}
          </span>
          <Link href={`/media/${r.slug ?? r.midiaId}`} className="font-medium hover:underline">
            {r.titulo}
          </Link>
          {r.ano != null && <span className="text-xs text-[#6B6B85]">{r.ano}</span>}
          {r.notaEditorial && (
            <span className="text-xs text-[#6B6B85] basis-full sm:basis-auto">
              {r.notaEditorial}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
