"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

  if (carregando) return <div className="py-4 text-sm text-[#9CA3AF]">{t("loadingSeasons")}</div>;
  if (temporadas.length === 0) return null;

  const atual = temporadas[ativa] ?? temporadas[0];

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A0A0B8] mb-3">
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
                ? "border-[#818CF8] bg-[#2A2A3D] text-[#EDE7DC]"
                : "border-[#2A2A3D] text-[#9CA3AF] hover:bg-[#1C1C2E]"
            }`}
          >
            {t("seasonLabel", { numero: temp.numero })}
          </button>
        ))}
      </div>
      {atual && (
        <ul className="divide-y divide-[#2A2A3D] rounded-xl border border-[#2A2A3D] bg-[#11111E]">
          {atual.episodios.map((ep) => (
            <li
              key={ep.numero}
              className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-[#EDE7DC]">
                  <span className="text-[#6B6B85]">{ep.numero}.</span> {ep.titulo}
                </p>
                {ep.data_exibicao && (
                  <p className="text-xs text-[#80809B]">
                    {new Date(ep.data_exibicao).toLocaleDateString()}
                  </p>
                )}
              </div>
              {ep.nota_publico != null && (
                <span className="shrink-0 rounded-full bg-[#1C1C2E] px-2 py-0.5 text-xs font-medium text-[#EDE7DC]">
                  {ep.nota_publico.toFixed(1)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
