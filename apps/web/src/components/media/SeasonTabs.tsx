"use client";

import { formatarScoreLocale } from "@/lib/score-utils";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/lib/http";

interface EpisodioApi {
  numero: number;
  titulo: string;
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

/** T288 — abas horizontais de temporadas + lista de episódios com notas. */
export function SeasonTabs({ midiaId }: { midiaId: string }) {
  const t = useTranslations("metadados");
  const locale = useLocale();
  const [temporadas, setTemporadas] = useState<TemporadaApi[]>([]);
  const [ativa, setAtiva] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    api
      .get<TemporadaApi[]>(`/api/v1/midias/${midiaId}/temporadas`)
      .then((data) => {
        if (!ativo) return;
        setTemporadas(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        /* ausência graciosa */
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [midiaId]);

  if (carregando)
    return <div className="py-4 text-sm text-fg-secondary">{t("loadingSeasons")}</div>;
  if (temporadas.length === 0) return null;

  const atual = temporadas[ativa] ?? temporadas[0];

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-3">
        {t("seasons")}
      </h3>
      <div className="mb-4 flex gap-2 overflow-x-auto" role="tablist" aria-label={t("seasons")}>
        {temporadas.map((temp, i) => (
          <button
            key={temp.numero}
            type="button"
            role="tab"
            aria-selected={i === ativa}
            onClick={() => setAtiva(i)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              i === ativa
                ? "border-accent-indigo bg-surface-border text-fg-primary"
                : "border-surface-border text-fg-secondary hover:bg-surface-elevated"
            }`}
          >
            {t("seasonLabel", { numero: temp.numero })}
          </button>
        ))}
      </div>
      {atual && (
        <ul
          role="list"
          className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-card"
        >
          {atual.episodios.map((ep) => (
            <li
              key={ep.numero}
              className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-fg-primary">
                  <span className="text-fg-muted">{ep.numero}.</span> {ep.titulo}
                </p>
                {ep.data_exibicao && (
                  <p className="text-xs text-fg-muted">
                    {new Date(ep.data_exibicao).toLocaleDateString(locale)}
                  </p>
                )}
              </div>
              {ep.nota_publico != null && (
                <span className="shrink-0 rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium text-fg-primary">
                  {formatarScoreLocale(ep.nota_publico, locale)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
