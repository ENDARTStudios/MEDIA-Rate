"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/use-auth-store";
import { api } from "@/lib/http";
import { getRelacoes, type RelacoesResponse } from "@/lib/api-relations";
import { RelatedCard } from "./RelatedCard";

interface InteracaoItem {
  midia_id?: string;
  status?: string;
  midia?: { id?: string; titulo?: string; tipo?: string } | null;
}

/**
 * Seção logada da home (T199, Addendum 3 §3.2): "Porque você viu/leu/jogou
 * X" — cross-mídia por definição, acima dos carrosséis genéricos. Só para
 * usuário com consumo registrado; sem consumo/relações → não renderiza.
 */
export function BecauseYouConsumed() {
  const t = useTranslations("discovery");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [data, setData] = useState<RelacoesResponse | null>(null);
  const [origemTitulo, setOrigemTitulo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
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
  }, [isAuthenticated]);

  if (loading || !isAuthenticated || !data || data.relacoes.length === 0) return null;

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
