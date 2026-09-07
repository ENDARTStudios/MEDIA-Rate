"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { getDiscoveries, type Discovery } from "@/lib/api-discoveries";
import { isLocalSource, localSrcSet, remoteLadder } from "@/lib/image-policy";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import { titleForLocale } from "@/lib/i18n-content";
import { relationLabelKey } from "@/components/discovery/RelatedCard";
import { Button } from "@/components/ui/button";
import type { MediaType } from "@/lib/types";

function mediaToken(tipo: string) {
  return CATEGORY_TOKENS[tipo.toLowerCase() as MediaType] ?? CATEGORY_TOKENS.movie;
}

function formatData(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function Item({ d, locale }: { d: Discovery; locale: string }) {
  const td = useTranslations("dashboard");
  const trel = useTranslations("discovery");
  const fromToken = mediaToken(d.fromMediaType);
  const toToken = mediaToken(d.toMediaType);
  const fromTitle = titleForLocale({ title: d.fromMedia.titulo, id: d.fromMediaId }, locale);
  const toTitle = titleForLocale({ title: d.toMedia.titulo, id: d.toMediaId }, locale);
  const FromIcon = fromToken.icon;
  const ToIcon = toToken.icon;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-[#2A2A3D] bg-[#12121C] p-3">
      {d.fromMedia.imagemUrl ? (
        (() => {
          // T031/T036: estático com ladder (local ou remota); sem ladder → bypass.
          const src = d.fromMedia.imagemUrl as string;
          if (isLocalSource(src)) {
            return (
              <img
                src={src}
                srcSet={localSrcSet(src)}
                alt=""
                width={40}
                height={56}
                className="h-14 w-10 shrink-0 rounded object-cover"
                aria-hidden="true"
              />
            );
          }
          const ladder = remoteLadder(src);
          if (ladder) {
            return (
              <img
                src={ladder.src}
                srcSet={ladder.srcSet}
                alt=""
                width={40}
                height={56}
                className="h-14 w-10 shrink-0 rounded object-cover"
                aria-hidden="true"
              />
            );
          }
          return (
            <Image
              src={src}
              alt=""
              width={40}
              height={56}
              className="h-14 w-10 shrink-0 rounded object-cover"
              aria-hidden="true"
              unoptimized
            />
          );
        })()
      ) : (
        <span
          className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-[#1C1C2E]"
          aria-hidden="true"
        >
          <FromIcon className="h-4 w-4" style={{ color: fromToken.color }} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[#A0A0B8]">
          {td("feedDiscovered")} <span className="font-medium text-[#EDE7DC]">{toTitle}</span>{" "}
          {td("feedFrom")} <span className="text-[#EDE7DC]">{fromTitle}</span>
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-[#6B6B85]">
          <ToIcon className="h-3 w-3" style={{ color: toToken.color }} aria-hidden="true" />
          {trel(relationLabelKey(d.relationType))} · {formatData(d.discoveredAt, locale)}
        </p>
      </div>
      <Link
        href={`/media/${d.toMediaId}`}
        className="shrink-0 rounded-md border border-[#2A2A3D] px-2.5 py-1 text-xs font-medium text-[#A0A0B8] hover:text-[#EDE7DC] hover:bg-[#1C1C2E] transition-colors"
      >
        {td("openTitle")}
      </Link>
    </li>
  );
}

/** Página completa de descobertas cross-mídia (T201, §5.1). */
export function DiscoveriesContent() {
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-2">{t("discoveries")}</h1>
      <p className="text-sm text-[#A0A0B8] mb-8">{t("discoveriesSub")}</p>

      {data == null ? (
        <p className="text-sm text-[#6B6B85]" role="status">
          {t("loading")}
        </p>
      ) : data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#2A2A3D] py-20 text-center"
          role="status"
        >
          <p className="text-[#A0A0B8] mb-4">{t("feedEmpty")}</p>
          <Link href="/catalog">
            <Button>{t("feedEmptyCta")}</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3" data-testid="discoveries-feed">
          {data.map((d) => (
            <Item key={`${d.toMediaId}-${d.discoveredAt}`} d={d} locale={locale} />
          ))}
        </ul>
      )}
    </div>
  );
}
