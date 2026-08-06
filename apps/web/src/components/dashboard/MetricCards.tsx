"use client";

/**
 * MetricCards (Parte 3.4, T189) — 4 cards de métrica com micro-gráficos
 * (sparkline de 6 meses ou mini donut). Recharts client-side.
 */
import { Area, AreaChart, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

export interface MetricCardData {
  label: string;
  value: string | number;
  color: string;
  note: string;
  spark?: { v: number }[];
  donut?: { name: string; value: number }[];
}

export function MetricCards({ cards }: { cards: MetricCardData[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10" data-testid="metric-cards">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-4">
          <p className="text-xs text-[#A0A0B8] uppercase tracking-wider mb-2">{card.label}</p>
          <p className="text-3xl font-heading font-bold tabular-nums" style={{ color: card.color }}>
            {card.value}
          </p>
          <p className="text-xs text-[#80809B] mt-1">{card.note}</p>
          <div className="mt-3 h-8" aria-hidden="true">
            {card.donut ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={card.donut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    isAnimationActive={false}
                  >
                    {card.donut.map((d) => (
                      <Cell key={d.name} fill={card.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : card.spark && card.spark.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={card.spark}>
                  <Tooltip
                    contentStyle={{
                      background: "#1B1B2C",
                      border: "1px solid #2A2A3D",
                      borderRadius: 8,
                      color: "#F5F5F7",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={card.color}
                    fill={card.color}
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
