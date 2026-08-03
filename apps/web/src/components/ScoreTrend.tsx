export interface ScoreSnapshot {
  date: string;
  score: number;
}

export interface ScoreTrendProps {
  snapshots: ScoreSnapshot[];
}

export function ScoreTrend({ snapshots }: ScoreTrendProps) {
  if (!snapshots || snapshots.length < 2) return null;

  const lastIndex = snapshots.length - 1;
  const latest = snapshots[lastIndex];
  const previous = snapshots[lastIndex - 1];
  if (latest == null || previous == null) return null;
  const delta = latest.score - previous.score;

  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const color = delta > 0 ? "#34D399" : delta < 0 ? "#EF4444" : "#6B7280";
  const sign = delta > 0 ? "+" : "";
  const displayDelta = `${sign}${delta.toFixed(1)}`;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium tabular-nums"
      style={{ color }}
      data-testid="score-trend"
      title={`${snapshots.length} snapshots`}
    >
      <span>{arrow}</span>
      <span>{displayDelta}</span>
    </span>
  );
}
