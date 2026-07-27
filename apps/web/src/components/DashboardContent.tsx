"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";

const COLUMN_LABELS: Record<string, string> = {
  WANT: "wantToSee",
  WATCHING: "watching",
  COMPLETED: "completed",
  DROPPED: "dropped",
};

const COLUMN_COLORS: Record<string, string> = {
  WANT: "bg-[#38BDF8]",
  WATCHING: "bg-[#818CF8]",
  COMPLETED: "bg-[#34D399]",
  DROPPED: "bg-[#6B7280]",
};

export function DashboardContent() {
  const t = useTranslations("dashboard");
  const { user } = useAuthStore();
  const { entries, isLoading, fetchWatchlist } = useWatchlistStore();

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const total = entries.length;
  const statusCounts: Record<string, number> = { WANT: 0, WATCHING: 0, COMPLETED: 0, DROPPED: 0 };
  entries.forEach((e) => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });
  const completedCount = statusCounts.COMPLETED || 0;
  const watchingCount = statusCounts.WATCHING || 0;

  if (isLoading && total === 0) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <p className="text-[#9CA3AF]">{t("loading")}</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-4">{t("title")}</h1>
        <p className="text-[#9CA3AF] mb-6">{t("emptyDesc")}</p>
        <Link href="/catalog"><Button>{t("exploreCatalog")}</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{t("title")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-2">{t("totalWatchlist")}</p>
          <p className="text-5xl font-heading font-bold text-[#EDE7DC] tabular-nums">{total}</p>
          <p className="text-sm text-[#6B7280] mt-2">{t("titulos")}</p>
        </div>
        <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-2">{t("watchingNow")}</p>
          <p className="text-5xl font-heading font-bold text-[#818CF8] tabular-nums">{watchingCount}</p>
          <p className="text-sm text-[#6B7280] mt-2">{t("inProgress")}</p>
        </div>
        <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-2">{t("completed")}</p>
          <p className="text-5xl font-heading font-bold text-[#34D399] tabular-nums">{completedCount}</p>
          <p className="text-sm text-[#6B7280] mt-2">{t("concluidos")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
          <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-6">{t("statusDistribution")}</h2>
          <div className="space-y-4">
            {Object.entries(COLUMN_LABELS).map(([status, labelKey]) => {
              const count = statusCounts[status] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#EDE7DC]">{t(labelKey)}</span>
                    <span className="text-[#9CA3AF] tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1C1C2E] overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${COLUMN_COLORS[status]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
          <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-6">{t("whereWatch")}</h2>
          <p className="text-sm text-[#6B7280] text-center py-8">{t("noStreamingData")}</p>
        </div>
      </div>

      <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
        <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">{t("tasteEvolution")}</h2>
        <p className="text-sm text-[#6B7280] text-center py-8">{t("tasteEvolutionDesc")}</p>
      </div>
    </div>
  );
}
