"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getRelacoes, type RelacoesResponse } from "@/lib/api-relations";
import { RelatedCard } from "./RelatedCard";

/**
 * Bloco de destaque da ficha técnica (T199, Addendum 3 §3.1):
 * "Essa história também está em..." — imediatamente abaixo do bloco de
 * score, acima da dobra. 1 aresta já ativa a funcionalidade; sem relações
 * (ou fonte indisponível) → não renderiza (matriz de ausência).
 */
export function RelatedWorksBlock({ mediaId }: { mediaId: string }) {
  const t = useTranslations("discovery");
  const [data, setData] = useState<RelacoesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    void getRelacoes(mediaId).then((r) => {
      if (!ativo) return;
      setData(r);
      setLoading(false);
    });
    return () => {
      ativo = false;
    };
  }, [mediaId]);

  if (loading) return null;
  if (!data || data.relacoes.length === 0) return null;

  return (
    <section data-testid="related-works" aria-labelledby="related-works-title">
      <h3
        id="related-works-title"
        className="text-xs font-semibold uppercase tracking-wider text-[#A0A0B8] mb-3"
      >
        {t("relatedWorksTitle")}
      </h3>
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none -mx-1 px-1"
        role="list"
        aria-label={t("relatedWorksTitle")}
      >
        {data.relacoes.map((r) => (
          <div key={r.id} role="listitem" className="snap-start">
            <RelatedCard relacao={r} />
          </div>
        ))}
      </div>
    </section>
  );
}
