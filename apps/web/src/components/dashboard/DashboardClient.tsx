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
  /** UAT-43: gêneros por tipo de mídia p/ o radar recortado (Plus+). */
  generos_por_tipo: { tipo: string; generos: Record<string, number> }[];
  evolucao: { mes: string; total: number }[] | null;
  /** UAT-45: evolução 12m quebrada por tipo (Premium — todas as mídias). */
  evolucao_tipos: { mes: string; total: number; por_tipo: Record<string, number> }[] | null;
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
  // D-619 (P0): `hydrated` separa "é visitante" de "ainda não sei". Sem ele, o efeito
  // abaixo decidia cedo demais e a tela mostrava "Entre para ver seu dashboard" para quem
  // está logado quando nenhum outro componente tinha hidratado o store.
  const authHydrated = useAuthStore((s) => s.hydrated);
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
    // Espera saber quem é antes de decidir (D-619).
    if (!authHydrated) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void carregar();
  }, [authHydrated, isAuthenticated, carregar]);

  if (authHydrated && !isAuthenticated) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-fg-secondary">
        <p className="mb-3">{t("loginHint")}</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-hover"
        >
          {t("login")}
        </button>
      </div>
    );
  }

  if (loading) return <div className="py-8 text-fg-secondary">{t("loading")}</div>;
  if (error)
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        {t("error")}
      </div>
    );

  if (!stats) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-fg-secondary">
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
        <div className="rounded-2xl border border-accent-indigo/20 bg-gradient-to-br from-surface-elevated via-surface-card to-surface-card p-8 text-center">
          <p className="text-lg font-medium text-fg-primary">{t("emptyHint")}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/catalog"
              className="rounded-xl bg-accent-indigo px-5 py-2.5 text-sm font-semibold text-accent-indigo-foreground transition hover:bg-accent-violet"
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
