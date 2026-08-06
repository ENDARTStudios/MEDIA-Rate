"use client";

import { useTranslations } from "next-intl";
import type { TasteMonth } from "@/lib/api-discoveries";

/**
 * TrendSummaryPhrase (T201, Addendum 3 §5.2) — frase automática de tendência
 * comparando o peso de um gênero agora vs 6 meses atrás. Nunca fabrica número
 * sem dados: com variação < limiar → frase neutra; sem dados → aviso honesto.
 */
export function TrendSummaryPhrase({ data }: { data: TasteMonth[] | null }) {
  const t = useTranslations("dashboard");
  const tg = useTranslations("genres");

  if (!data || data.length < 2 || data.every((m) => Object.keys(m.genreWeights).length === 0)) {
    return (
      <p className="text-sm text-[#80809B]" data-testid="trend-no-data">
        {t("trendNoData")}
      </p>
    );
  }

  const agora = data[data.length - 1];
  const antes = data[Math.max(0, data.length - 7)] ?? data[0];
  const pesosAgora = agora.genreWeights;
  const pesosAntes = antes.genreWeights;
  const slugs = new Set([...Object.keys(pesosAgora), ...Object.keys(pesosAntes)]);

  let melhor: { slug: string; delta: number } | null = null;
  for (const slug of slugs) {
    const vAgora = pesosAgora[slug] ?? 0;
    const vAntes = pesosAntes[slug] ?? 0;
    const delta = vAgora - vAntes;
    if (!melhor || Math.abs(delta) > Math.abs(melhor.delta)) {
      melhor = { slug, delta };
    }
  }

  const TREND_THRESHOLD = 0.05; // 5 pontos percentuais de peso normalizado
  if (!melhor || Math.abs(melhor.delta) < TREND_THRESHOLD) {
    return (
      <p className="text-sm text-[#80809B]" data-testid="trend-neutral">
        {t("trendNeutral")}
      </p>
    );
  }

  const basePeso = melhor.delta >= 0 ? (pesosAntes[melhor.slug] ?? 0) : null;
  const pct =
    basePeso && basePeso > 0
      ? Math.round((melhor.delta / basePeso) * 100)
      : Math.round(melhor.delta * 100);
  const nome = tg.has(melhor.slug) ? tg(melhor.slug) : melhor.slug;
  const subiu = melhor.delta > 0;

  return (
    <p className="text-sm text-[#EDE7DC]" data-testid="trend-phrase">
      {subiu
        ? t("trendPhraseUp", { genre: nome, pct: Math.abs(pct) })
        : t("trendPhraseDown", { genre: nome, pct: Math.abs(pct) })}
    </p>
  );
}
