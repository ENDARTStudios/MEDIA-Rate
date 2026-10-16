/** Sparkline do protótipo (MiniSparkline) — polyline SVG sem deps. */
export function MiniSparkline({
  values,
  color,
  ariaLabel,
}: {
  values: number[];
  color: string;
  ariaLabel: string;
}) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${i * 22},${34 - (v / max) * 28}`).join(" ");
  const lastX = (values.length - 1) * 22;
  const lastY = 34 - (values[values.length - 1] / max) * 28;
  return (
    <svg
      viewBox="0 0 132 38"
      className="h-9 w-32 shrink-0 overflow-visible"
      role="img"
      aria-label={ariaLabel}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
    </svg>
  );
}
