"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { useAuthStore } from "@/stores/use-auth-store";
import { useRouter } from "@/lib/navigation";

interface UserStats {
  plano: string;
  upgrade: boolean;
  tipos: Record<string, number>;
  generos: Record<string, number>;
  evolucao: { mes: string; total: number }[] | null;
}

/** T295 — SVG radar próprio (5-8 eixos) + sparkline temporal, sem deps. */
function RadarSVG({ dados }: { dados: Record<string, number> }) {
  const entradas = Object.entries(dados).slice(0, 8);
  if (entradas.length < 3) return null;
  const N = entradas.length;
  const raio = 90;
  const cx = 120;
  const cy = 110;
  const max = Math.max(1, ...entradas.map(([, v]) => v));
  const pontos = entradas.map(([, v], i) => {
    const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
    const r = (v / max) * raio;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  });
  const poligono = pontos.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox="0 0 240 220" className="mx-auto w-full max-w-sm" role="img" aria-label="Radar">
      {entradas.map(([nome], i) => {
        const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
        const x = cx + raio * Math.cos(ang);
        const y = cy + raio * Math.sin(ang);
        return (
          <g key={nome}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#2A2A3D" />
            <text x={cx + (raio + 16) * Math.cos(ang)} y={cy + (raio + 16) * Math.sin(ang)} textAnchor="middle" fontSize="10" fill="#9CA3AF">
              {nome}
            </text>
          </g>
        );
      })}
      <polygon points={poligono} fill="#818CF833" stroke="#818CF8" strokeWidth="2" />
    </svg>
  );
}

function Sparkline({ evolucao }: { evolucao: { mes: string; total: number }[] }) {
  const vals = evolucao.map((e) => e.total);
  const max = Math.max(1, ...vals);
  const w = 400;
  const h = 60;
  const pts = vals
    .map((v, i) => `${(i / Math.max(1, vals.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Temporal">
      <polyline points={pts} fill="none" stroke="#E11D48" strokeWidth="2" />
    </svg>
  );
}

export function DashboardClient() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await api.get<UserStats>("/api/v1/user/stats");
      setStats(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void carregar();
  }, [isAuthenticated, carregar]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-8 text-center text-[#9CA3AF]">
        <p className="mb-3">{t("loginHint")}</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-lg bg-[#E11D48] px-4 py-2 text-sm text-white hover:bg-[#C31442]"
        >
          {t("login")}
        </button>
      </div>
    );
  }

  if (loading) return <div className="py-8 text-[#9CA3AF]">{t("loading")}</div>;
  if (error)
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{t("error")}</div>;

  if (!stats || stats.upgrade) {
    return (
      <div className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-8 text-center text-[#9CA3AF]">
        <p className="text-lg font-medium text-[#EDE7DC] mb-1">{t("upgradeTitle")}</p>
        <p className="mb-4">{t("upgradeHint")}</p>
        <button
          type="button"
          onClick={() => router.push("/pricing")}
          className="rounded-lg bg-[#E11D48] px-4 py-2 text-sm text-white hover:bg-[#C31442]"
        >
          {t("upgrade")}
        </button>
      </div>
    );
  }

  const temDados = Object.keys(stats.tipos).length > 0 || Object.keys(stats.generos).length > 0;
  if (!temDados) {
    return (
      <div className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-8 text-center text-[#9CA3AF]">
        <p className="text-lg font-medium text-[#EDE7DC] mb-1">{t("emptyTitle")}</p>
        <p>{t("emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A0A0B8] mb-4">{t("radar")}</h2>
        <RadarSVG dados={{ ...stats.tipos, ...stats.generos }} />
        <table className="sr-only">
          <caption>{t("radarTable")}</caption>
          <tbody>
            {Object.entries({ ...stats.tipos, ...stats.generos }).map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {stats.evolucao ? (
        <section className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A0A0B8] mb-4">
            {t("evolution")}
          </h2>
          <Sparkline evolucao={stats.evolucao} />
          <table className="mt-4 w-full text-sm text-[#9CA3AF]">
            <caption className="sr-only">{t("evolutionTable")}</caption>
            <tbody>
              {stats.evolucao.map((e) => (
                <tr key={e.mes}>
                  <td>{e.mes}</td>
                  <td className="text-right text-[#EDE7DC]">{e.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-6 text-[#9CA3AF] text-sm">
          {t("premiumHint")}
        </section>
      )}
    </div>
  );
}
