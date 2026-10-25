import { useTranslations } from "next-intl";
import { DASH } from "@/lib/dashboard-palette";
import type { RadarAxis } from "@/lib/dashboard-overview-data";
/** Radar de gosto — atual vs. leitura anterior, SVG próprio. */
export function RadarGraphic({ axes }: { axes: RadarAxis[] }) {
  const t = useTranslations("dashboard");
  const center = 150;
  const radius = 104;
  const rings = [0.25, 0.5, 0.75, 1];
  const pointFor = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    const distance = (radius * value) / 100;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };
  // A "leitura anterior" só existe em dados de demonstração — dados reais
  // não têm série histórica por gênero (nada de comparação fabricada).
  const temAnterior = axes.some((a) => a.previous != null);
  const buildPolygon = (key: "value" | "previous") =>
    axes
      .map((point, index) => {
        const next = pointFor(
          index,
          key === "previous" ? (point.previous ?? point.value) : point.value,
        );
        return `${next.x.toFixed(1)},${next.y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-[24px] bg-dash-surface-5 px-3 py-5">
      <div className="absolute left-5 top-5 z-10 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
        {t("radarCurrent")}
      </div>
      <svg
        viewBox="0 0 300 300"
        className="h-[300px] w-[300px] max-w-full"
        role="img"
        aria-label={
          axes.length > 8
            ? `${t("radarAria")} — ${axes.length} ${t("radarAriaEixos")}: ${axes
                .slice(0, 3)
                .map((a) => a.label)
                .join(", ")}…`
            : t("radarAria")
        }
      >
        {/* T154: descrição completa para leitores de tela (dados reais). */}
        <desc>{axes.map((a) => `${a.label}: ${a.value}/100`).join("; ")}</desc>
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={axes
              .map((_, index) => {
                const p = pointFor(index, ring * 100);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
        ))}
        {axes.map((_, index) => {
          const p = pointFor(index, 100);
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="rgba(255,255,255,0.11)"
              strokeWidth="1"
            />
          );
        })}
        {temAnterior && (
          <polygon
            points={buildPolygon("previous")}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}
        <polygon
          points={buildPolygon("value")}
          fill="rgba(139,124,255,0.28)"
          stroke={DASH.violet}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {axes.map((point, index) => {
          const p = pointFor(index, point.value);
          return (
            <circle
              key={point.label}
              cx={p.x}
              cy={p.y}
              r="4"
              fill={DASH.violet}
              stroke={DASH.surface6}
              strokeWidth="2"
            />
          );
        })}
        {axes.map((point, index) => {
          const label = pointFor(index, 116);
          // T154: com 8+ eixos, rótulos menores e ancorados pelo lado evitam
          // colisão/corte nas bordas do viewBox (overflow-hidden).
          const dx = label.x - 150;
          const anchor = Math.abs(dx) < 24 ? "middle" : dx > 0 ? "start" : "end";
          return (
            <text
              key={point.label}
              x={label.x}
              y={label.y}
              fill="rgba(255,255,255,0.65)"
              fontSize={axes.length > 8 ? 8.5 : 10}
              textAnchor={anchor}
              dominantBaseline="middle"
            >
              {point.label}
            </text>
          );
        })}
      </svg>
      <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-[11px] text-white/45">
        <span className="flex items-center gap-2">
          <i className="h-2 w-2 rounded-full bg-dash-violet" /> {t("radarNow")}
        </span>
        {temAnterior && (
          <span className="flex items-center gap-2">
            <i className="h-2 w-2 rounded-full border border-dashed border-white/40" />{" "}
            {t("radarBefore")}
          </span>
        )}
      </div>
    </div>
  );
}
