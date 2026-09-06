"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";
import { isLocalSource, localSrcSet, remoteLadder } from "@/lib/image-policy";
import type { RelacaoItem } from "@/lib/api-relations";

/**
 * Card de obra relacionada (T199, Addendum 3 §3.1): capa, título, tipo de
 * mídia (ícone + accent de categoria), MEDIA Score próprio e o tipo de
 * relação em texto curto.
 */
export function relationLabelKey(tipo: RelacaoItem["tipo"]): string {
  switch (tipo) {
    case "ADAPTACAO_DE":
      return "adaptedFrom";
    case "SEQUENCIA_DE":
      return "sequelOf";
    case "PREQUELA_DE":
      return "prequelOf";
    case "SPINOFF_DE":
      return "spinoffOf";
    case "MESMO_UNIVERSO":
      return "sameUniverse";
    case "MESMA_HISTORIA_REAL":
      return "sameRealStory";
  }
}

export function RelatedCard({ relacao }: { relacao: RelacaoItem }) {
  const t = useTranslations("discovery");
  const tc = useTranslations("catalog");
  const m = relacao.midia;
  const token = CATEGORY_TOKENS[m.tipo.toLowerCase() as MediaType];
  const Icon = token?.icon ?? CATEGORY_TOKENS.movie.icon;
  const cor = token?.color ?? CATEGORY_TOKENS.movie.color;
  const scoreLabel = m.score != null ? `${Math.round(m.score)}/100` : "—";
  const tipoLabel = token ? tc(token.labelKey) : m.tipo;

  return (
    <Link
      href={`/media/${m.slug}`}
      data-testid="related-card"
      className="group flex w-[200px] shrink-0 snap-start flex-col rounded-lg border border-[rgba(129,140,248,0.08)] bg-[#11111E] p-2.5 transition-colors hover:border-[rgba(129,140,248,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
    >
      <div className="relative h-28 w-full overflow-hidden rounded-md bg-[#1C1C2E]">
        {m.imagemUrl ? (
          (() => {
            // T031/T036: estático com ladder (local ou remota); sem ladder →
            // bypass — zero transformação runtime em qualquer caminho.
            if (isLocalSource(m.imagemUrl)) {
              return (
                <img
                  src={m.imagemUrl}
                  srcSet={localSrcSet(m.imagemUrl)}
                  alt={m.titulo}
                  sizes="200px"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                />
              );
            }
            const ladder = remoteLadder(m.imagemUrl);
            if (ladder) {
              return (
                <img
                  src={ladder.src}
                  srcSet={ladder.srcSet}
                  alt={m.titulo}
                  sizes="200px"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                />
              );
            }
            return (
              <Image
                src={m.imagemUrl}
                alt={m.titulo}
                fill
                sizes="200px"
                className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                unoptimized
              />
            );
          })()
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-8 w-8 text-[#6B7280]" aria-hidden="true" />
          </div>
        )}
        <span
          className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold text-[#09090F]"
          style={{ backgroundColor: cor }}
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {tipoLabel}
        </span>
      </div>

      <div className="mt-2 flex flex-1 flex-col">
        <p className="line-clamp-2 text-sm font-heading font-semibold text-[#EDE7DC] group-hover:text-[#A5B4FC]">
          {m.titulo}
        </p>
        <p className="mt-1 text-xs text-[#818CF8]">{t(relationLabelKey(relacao.tipo))}</p>
        <p className="mt-auto pt-1 text-xs text-[#9CA3AF]">
          <span data-testid="related-score" className="font-semibold text-[#EDE7DC]">
            {scoreLabel}
          </span>{" "}
          {m.anoLancamento ?? ""}
        </p>
      </div>
    </Link>
  );
}
