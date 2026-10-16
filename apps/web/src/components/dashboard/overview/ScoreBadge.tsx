import { Star } from "lucide-react";
import { DASH } from "@/lib/dashboard-palette";
import { formatScoreValue } from "@/lib/dashboard-overview-data";
export function ScoreBadge({ score, max }: { score: number; max: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-white/[0.07] px-2 py-1 text-[11px] font-bold text-white">
      <Star size={11} fill={DASH.amber} strokeWidth={0} className="text-dash-amber" />
      {formatScoreValue(score, max)}
    </span>
  );
}
