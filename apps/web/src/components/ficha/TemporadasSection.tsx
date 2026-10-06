"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SeriatedScoreTree, type SeriatedUnit } from "@/components/media-rate-ui/SeriatedScoreTree";
import { truncar1 } from "@/lib/score-utils";

/**
 * T163 (Onda B): notas por temporada (T288) — alimenta o SeriatedScoreTree
 * com o dado real de GET /midias/:id/temporadas. Nota da unidade = média dos
 * episódios COM nota pública (truncada, sem arredondar — política T147);
 * sem nota → null ("Ainda sem votos suficientes", nunca 0 fabricado).
 * NUNCA afeta o MEDIA Score geral da obra.
 */

interface EpisodioApi {
  numero: number;
  titulo: string | null;
  data_exibicao: string | null;
  nota_publico: number | null;
  nota_critica: number | null;
}

interface TemporadaApi {
  numero: number;
  titulo: string | null;
  ano: number | null;
  poster_url: string | null;
  episodios: EpisodioApi[];
}

export function TemporadasSection({ midiaId }: { midiaId: string }) {
  const t = useTranslations("metadados");
  const [units, setUnits] = useState<SeriatedUnit[] | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/v1/midias/${midiaId}/temporadas`, { signal: AbortSignal.timeout?.(8000) })
      .then((res) => (res.ok ? res.json() : []))
      .then((temporadas: TemporadaApi[]) => {
        if (!ativo) return;
        setUnits(
          (temporadas ?? []).map((temp) => {
            const comNota = temp.episodios.filter((e) => e.nota_publico != null);
            const media =
              comNota.length > 0
                ? truncar1(
                    comNota.reduce((acc, e) => acc + (e.nota_publico ?? 0), 0) / comNota.length,
                  )
                : null;
            return {
              label: t("seasonLabel", { numero: temp.numero }),
              score: media,
              subUnits: comNota.map((e) => ({
                label: `Ep. ${e.numero}`,
                score: e.nota_publico ?? null,
              })),
            };
          }),
        );
      })
      .catch(() => {
        if (ativo) setUnits([]);
      });
    return () => {
      ativo = false;
    };
  }, [midiaId, t]);

  // Enquanto carrega: nada (o bloco é progressivo — nunca bloqueia a ficha).
  if (units == null) return null;
  return (
    <div data-testid="ficha-temporadas">
      <SeriatedScoreTree unitLabel={t("seasonUnit")} units={units} />
    </div>
  );
}
