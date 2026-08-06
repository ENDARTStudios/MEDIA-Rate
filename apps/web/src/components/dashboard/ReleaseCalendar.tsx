"use client";

/**
 * ReleaseCalendar (Parte 3.4, T189) — próximos 30 dias da watchlist com
 * data de estreia. Sem datas no modelo → estado vazio honesto (nunca
 * fabrica datas). Reusa ReleaseTimeline (media-rate-ui).
 */
import { ReleaseTimeline } from "@/components/media-rate-ui/ReleaseTimeline";

export interface ReleaseItem {
  id: string;
  date: string;
  title: string;
}

export function ReleaseCalendar({
  items,
  title,
  emptyMessage,
}: {
  items: ReleaseItem[];
  title: string;
  emptyMessage: string;
}) {
  return (
    <div
      className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6"
      data-testid="release-calendar"
    >
      <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">{title}</h2>
      <ReleaseTimeline items={items.map((i) => ({ date: i.date, title: i.title }))} />
      {items.length === 0 && <p className="text-sm text-[#80809B]">{emptyMessage}</p>}
    </div>
  );
}
