"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { useAuthStore } from "@/stores/use-auth-store";
import { useRouter } from "@/lib/navigation";
import { Link } from "@/lib/navigation";
import { DashboardOverview } from "./DashboardOverview";

export interface UserStats {
  plano: string;
  upgrade: boolean;
  total: number;
  /** T-AUD: interações CONCLUIDO (taxa de conclusão real do overview). */
  concluidos: number;
  tipos: Record<string, number>;
  generos: Record<string, number>;
  evolucao: { mes: string; total: number }[] | null;
  // T396: streak + histograma de scores (todos os planos).
  streak: number;
  histograma: { faixa: string; total: number }[];
}

/**
 * Dashboard consolidada (T460 + auditoria S1): um único fluxo — o
 * DashboardClient busca `/api/v1/user/stats` e delega 100% da renderização
 * ao DashboardOverview (métricas reais primeiro, demonstração rotulada F17,
 * gating por plano coerente com T402/D-378).
 */
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
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        {t("error")}
      </div>
    );

  if (!stats) {
    return (
      <div className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-8 text-center text-[#9CA3AF]">
        <p className="mb-4">{t("error")}</p>
      </div>
    );
  }

  // Conta sem atividade: boas-vindas com CTAs para as atividades que
  // alimentam a dashboard — mas o overview continua visível (descobertas,
  // conquistas e tendência funcionam sem dados pessoais).
  if (stats.total === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#8b7cff]/20 bg-gradient-to-br from-[#18152d] via-[#12121f] to-[#11111E] p-8 text-center">
          <p className="text-lg font-medium text-[#EDE7DC]">{t("emptyHint")}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/catalog"
              className="rounded-xl bg-[#8b7cff] px-5 py-2.5 text-sm font-semibold text-[#0d0d14] transition hover:bg-[#a69cff]"
            >
              {t("exploreCatalog")}
            </Link>
            <Link
              href="/dashboard/discoveries"
              className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
            >
              {t("navDiscoveries")}
            </Link>
            <Link
              href="/biblioteca"
              className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
            >
              {t("navLibrary")}
            </Link>
          </div>
        </div>
        <DashboardOverview stats={stats} />
      </div>
    );
  }

  return <DashboardOverview stats={stats} />;
}
