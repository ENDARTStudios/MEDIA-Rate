"use client";

/**
 * ConsumptionTimeline (Parte 3.4, T189) — consumo por mês em área empilhada
 * por tipo de mídia (cores da Parte 2.3). Recharts client-side.
 */
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

export interface ConsumptionPoint {
  key: string;
  label: string;
  movie: number;
  series: number;
  game: number;
  total: number;
}

const TYPE_COLORS: Record<string, string> = {
  movie: "#818CF8",
  series: "#38BDF8",
  game: "#34D399",
};

const TYPES = ["movie", "series", "game"] as const;

export function ConsumptionTimeline({
  data,
  title,
  emptyMessage,
  labels,
}: {
  data: ConsumptionPoint[];
  title: string;
  emptyMessage: string;
  labels: Record<string, string>;
}) {
  return (
    <div
      className="mb-10 rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6"
      data-testid="consumption-timeline"
    >
      <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-6">{title}</h2>
      {data.every((m) => m.total === 0) ? (
        <p className="text-sm text-[#80809B] text-center py-8">{emptyMessage}</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              {TYPES.map((type) => (
                <linearGradient key={type} id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TYPE_COLORS[type]} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={TYPE_COLORS[type]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <Tooltip
              contentStyle={{
                background: "#1B1B2C",
                border: "1px solid #2A2A3D",
                borderRadius: 8,
                color: "#F5F5F7",
              }}
            />
            {TYPES.map((type) => (
              <Area
                key={type}
                type="monotone"
                dataKey={type}
                stackId="1"
                stroke={TYPE_COLORS[type]}
                fill={`url(#grad-${type})`}
                strokeWidth={1.5}
                name={labels[type]}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
