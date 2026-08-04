"use client";

/**
 * Radar chart do perfil de gosto (Parte 3.4) — wrapper do Recharts.
 *
 * Dados reais quando disponíveis (ex.: distribuição por tipo de mídia);
 * radar de gêneros (Ação/Drama/...) entra quando o catálogo tiver gêneros.
 */
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

export interface TasteRadarChartProps {
  data: { axis: string; value: number }[];
  color?: string;
  className?: string;
}

export function TasteRadarChart({ data, color = "#818CF8", className }: TasteRadarChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-[#6B6B85]" role="status">
        Sem dados suficientes para o perfil de gosto.
      </p>
    );
  }

  return (
    <div className={className} data-testid="taste-radar" role="img" aria-label="Perfil de gosto">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#2A2A3D" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#A0A0B8", fontSize: 11 }} />
          <Radar
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.25}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
