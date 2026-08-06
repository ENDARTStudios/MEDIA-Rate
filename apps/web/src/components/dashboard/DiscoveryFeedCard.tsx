"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/navigation";
import { getDiscoveries, type Discovery } from "@/lib/api-discoveries";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import { titleForLocale } from "@/lib/i18n-content";
import { relationLabelKey } from "@/components/discovery/RelatedCard";
import type { MediaType } from "@/lib/types";

function mediaToken(tipo: string) {
  return CATEGORY_TOKENS[tipo.toLowerCase() as MediaType] ?? CATEGORY_TOKENS.movie;
}

function DiscoveryRow({ d, locale }: { d: Discovery; locale: string }) {
  const trel = useTranslations("discovery");
  const FromIcon = mediaToken(d.fromMediaType).icon;
  const ToIcon = mediaToken(d.toMediaType).icon;
  const fromTitle = titleForLocale({ title: d.fromMedia.titulo, id: d.fromMediaId }, locale);
  const toTitle = titleForLocale({ title: d.toMedia.titulo, id: d.toMediaId }, locale);

  return (
    <li className="flex items-center gap-2 text-sm text-[#A0A0B8]">
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#1C1C2E]"
        aria-hidden="true"
      >
        <FromIcon className="h-3.5 w-3.5" style={{ color: mediaToken(d.fromMediaType).color }} />
      </span>
      <span className="truncate">{fromTitle}</span>
      <span aria-hidden="true" className="text-[#6B6B85]">
        →
      </span>
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#1C1C2E]"
        aria-hidden="true"
      >
        <ToIcon className="h-3.5 w-3.5" style={{ color: mediaToken(d.toMediaType).color }} />
      </span>
      <span className="truncate font-medium text-[#EDE7DC]">{toTitle}</span>
      <span className="ml-auto shrink-0 text-[10px] text-[#6B6B85]">
        {trel(relationLabelKey(d.relationType))}
      </span>
    </li>
  );
}

/**
 * DiscoveryFeedCard (T201, Addendum 3 §5.1) — card de resumo no topo do
 * dashboard: "N descobertas cross-mídia este ano" + prévia do feed.
 * Matriz de ausência: sem descobertas → empty state com CTA (nunca vazio).
 */
export function DiscoveryFeedCard() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [data, setData] = useState<Discovery[] | null>(null);

  useEffect(() => {
    let ativo = true;
    void getDiscoveries().then((d) => {
      if (ativo) setData(d);
    });
    return () => {
      ativo = false;
    };
  }, []);

  if (data == null) return null;

  const ano = new Date().getFullYear();
  const esteAno = data.filter((d) => new Date(d.discoveredAt).getFullYear() === ano);
  const preview = data.slice(0, 4);

  return (
    <section
      className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6"
      data-testid="discovery-feed-card"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-heading font-semibold text-[#F5F5F7]">{t("discoveries")}</h2>
          <p className="text-sm text-[#A0A0B8]">
            {esteAno.length === 1
              ? t("discoveriesCountOne")
              : t("discoveriesCount", { count: esteAno.length })}
          </p>
        </div>
        <Link
          href="/dashboard/discoveries"
          className="shrink-0 rounded-md border border-[#2A2A3D] px-2.5 py-1 text-xs font-medium text-[#A0A0B8] hover:text-[#EDE7DC] hover:bg-[#1C1C2E] transition-colors"
        >
          {t("feedSeeAll")}
        </Link>
      </div>

      {data.length === 0 ? (
        <div
          className="rounded-md border border-dashed border-[#2A2A3D] p-6 text-center"
          role="status"
        >
          <p className="text-sm text-[#80809B] mb-3">{t("feedEmpty")}</p>
          <Link
            href="/catalog"
            className="inline-block rounded-md bg-[#818CF8] px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition-colors hover:brightness-110"
          >
            {t("feedEmptyCta")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {preview.map((d) => (
            <DiscoveryRow key={`${d.toMediaId}-${d.discoveredAt}`} d={d} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  );
}
