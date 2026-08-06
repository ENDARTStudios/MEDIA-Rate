"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TasteMonth } from "@/lib/api-discoveries";

const PALETA = ["#818CF8", "#38BDF8", "#34D399", "#FBBF24", "#F472B6", "#A78BFA"];

function monthLabel(locale: string, key: string): string {
  const [y, mo] = key.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(d);
}

/**
 * TasteEvolutionChart (T201, Addendum 3 §5.2) — evolução do gosto por gênero
 * nos últimos 12 meses (área empilhada, Recharts). O radar permanece como
 * snapshot atual; este gráfico mostra a trajetória. reduced-motion desabilita
 * a animação. Matriz de ausência: sem histórico → mensagem honesta.
 */
export function TasteEvolutionChart({ data }: { data: TasteMonth[] | null }) {
  const t = useTranslations("dashboard");
  const tg = useTranslations("genres");
  const locale = useLocale();
  const shouldReduce = useReducedMotion();

  const { rows, genres } = useMemo(() => {
    if (!data) return { rows: [], genres: [] as string[] };
    const soma = new Map<string, number>();
    for (const m of data) {
      for (const [slug, v] of Object.entries(m.genreWeights)) {
        soma.set(slug, (soma.get(slug) ?? 0) + v);
      }
    }
    const top = [...soma.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([slug]) => slug);
    const rows = data.map((m) => {
      const row: Record<string, string | number> = { month: monthLabel(locale, m.month) };
      for (const slug of top) row[slug] = m.genreWeights[slug] ?? 0;
      return row;
    });
    return { rows, genres: top };
  }, [data, locale]);

  const vazio = rows.length === 0 || genres.length === 0;

  if (vazio) {
    return (
      <p className="text-sm text-[#6B6B85]" role="status">
        {t("tasteEvolutionEmpty")}
      </p>
    );
  }

  return (
    <div data-testid="taste-evolution-chart" role="img" aria-label={t("tasteEvolution")}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            {genres.map((slug, i) => (
              <linearGradient key={slug} id={`grad-${slug}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETA[i % PALETA.length]} stopOpacity={0.5} />
                <stop offset="100%" stopColor={PALETA[i % PALETA.length]} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#2A2A3D" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#80809B", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#80809B", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1B1B2C",
              border: "1px solid #2A2A3D",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#EDE7DC" }}
            formatter={(value, name) => [
              `${(Number(value) * 100).toFixed(0)}%`,
              typeof name === "string" && tg.has(name) ? tg(name) : String(name),
            ]}
          />
          {genres.map((slug, i) => (
            <Area
              key={slug}
              type="monotone"
              dataKey={slug}
              stackId="1"
              stroke={PALETA[i % PALETA.length]}
              fill={`url(#grad-${slug})`}
              isAnimationActive={!shouldReduce}
              name={tg.has(slug) ? tg(slug) : slug}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
