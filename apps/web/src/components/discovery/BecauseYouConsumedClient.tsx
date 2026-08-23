"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { getRelacoes, type RelacoesResponse } from "@/lib/api-relations";
import { RelatedCard } from "./RelatedCard";

interface InteracaoItem {
  midia_id?: string;
  status?: string;
  midia?: { id?: string; titulo?: string; tipo?: string } | null;
}

/**
 * BecauseYouConsumedClient — ilha client da seção "Porque você viu/leu/jogou"
 * (T199 §3.2). Só monta para autenticado (server wrapper lê cookie sess e
 * retorna null para anônimo). Fetch direto, sem zustand.
 */
export function BecauseYouConsumedClient() {
  const t = useTranslations("discovery");
  const [data, setData] = useState<RelacoesResponse | null>(null);
  const [origemTitulo, setOrigemTitulo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    void api
      .get<{ items?: InteracaoItem[] } | InteracaoItem[]>("/api/v1/interacoes")
      .then(async (resp) => {
        if (!ativo) return;
        const items = Array.isArray(resp) ? resp : (resp?.items ?? []);
        // Prioriza consumo concluído; senão, intenção (QUERO_CONSUMIR).
        const preferida =
          items.find((i) => i.status === "CONCLUIDO" && i.midia?.id) ??
          items.find((i) => i.status === "QUERO_CONSUMIR" && i.midia?.id);
        if (!preferida?.midia?.id) return;
        const rel = await getRelacoes(preferida.midia.id);
        if (!ativo) return;
        if (rel && rel.relacoes.length > 0) {
          setData(rel);
          setOrigemTitulo(preferida.midia.titulo ?? null);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (loading || !data || data.relacoes.length === 0) return null;

  return (
    <section data-testid="because-you-consumed" className="px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-heading text-2xl font-bold text-[#EDE7DC] mb-1">
          {t("becauseYouConsumed", { titulo: origemTitulo ?? "" })}
        </h2>
        <p className="text-sm text-[#9CA3AF] mb-6">{t("becauseYouConsumedSub")}</p>
        <div
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none -mx-1 px-1"
          role="list"
          aria-label={t("becauseYouConsumed", { titulo: origemTitulo ?? "" })}
        >
          {data.relacoes.map((r) => (
            <div key={r.id} role="listitem" className="snap-start">
              <RelatedCard relacao={r} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
