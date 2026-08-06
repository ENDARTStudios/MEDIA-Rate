"use client";

/**
 * TasteRadar (Parte 3.4, T189) — radar de perfil de gosto.
 * Wrapper do TasteRadarChart (media-rate-ui, Recharts).
 */
import { TasteRadarChart } from "@/components/media-rate-ui/TasteRadarChart";

export interface RadarPoint {
  axis: string;
  value: number;
}

export function TasteRadar({
  data,
  title,
  note,
}: {
  data: RadarPoint[];
  title: string;
  note?: string;
}) {
  return (
    <div
      className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6"
      data-testid="taste-radar"
    >
      <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">{title}</h2>
      <TasteRadarChart data={data} color="#818CF8" />
      {note && <p className="mt-2 text-[11px] text-[#80809B]">{note}</p>}
    </div>
  );
}
