"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/use-auth-store";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";

export function ProfileContent() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const { user } = useAuthStore();
  const { entries, isLoading, fetchWatchlist } = useWatchlistStore();

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const total = entries.length;
  const statusCounts: Record<string, number> = { WANT: 0, WATCHING: 0, COMPLETED: 0, DROPPED: 0 };
  entries.forEach((e) => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });
  const completed = statusCounts.COMPLETED || 0;
  const watching = statusCounts.WATCHING || 0;
  const dropped = statusCounts.DROPPED || 0;

  const badges = [
    { name: t("explorerTitle"), desc: t("explorerDesc"), unlocked: total >= 5 },
    { name: t("marathonerTitle"), desc: t("marathonerDesc"), unlocked: completed >= 3 },
    { name: t("activeTitle"), desc: t("activeDesc"), unlocked: watching >= 1 },
  ];

  if (isLoading && total === 0) {
    return <div className="max-w-4xl mx-auto py-16 px-4 text-center text-[#9CA3AF]">{tc("loading")}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-16 h-16 rounded-full bg-[#818CF8]/20 flex items-center justify-center text-2xl font-heading font-bold text-[#818CF8] shrink-0">
          {user?.name?.[0] ?? "?"}
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#EDE7DC]">{user?.name ?? "Usuário"}</h1>
          <p className="text-sm text-[#9CA3AF]">Plano Free · Membro desde Jan 2026</p>
          {total > 0 && <p className="text-xs text-[#6B7280] mt-1">{total} títulos</p>}
        </div>
      </div>

      {total === 0 && (
        <div className="text-center py-12 text-[#9CA3AF]">
          <p className="mb-4">Adicione títulos à sua watchlist para ver estatísticas e badges.</p>
          <Link href="/catalog"><Button variant="outline">Explorar catálogo</Button></Link>
        </div>
      )}

      {total > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[{ label: "Na watchlist", value: total }, { label: "Completos", value: completed }, { label: "Assistindo", value: watching }, { label: "Abandonados", value: dropped }].map(({ label, value }) => (
              <div key={label} className="bg-[#11111E] rounded-md p-5 text-center border border-[rgba(129,140,248,0.08)]">
                <p className="text-3xl font-heading font-bold text-[#EDE7DC] tabular-nums">{value}</p>
                <p className="text-xs text-[#9CA3AF] mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="mb-12">
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">Taste Profile</h2>
            <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
              <p className="text-sm text-[#6B7280] text-center py-8">Complete títulos e adicione notas para ver o perfil de gosto.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">Badges</h2>
            <div className="flex flex-wrap gap-3">
              {badges.map((b) => (
                <div key={b.name} className={`px-4 py-2 rounded-full text-sm font-medium border ${b.unlocked ? "bg-[#818CF8]/10 border-[#818CF8]/30 text-[#818CF8]" : "bg-[#11111E] border-[rgba(129,140,248,0.08)] text-[#6B7280]"}`}>
                  {b.unlocked ? "★" : "☆"} {b.name}
                  <span className="ml-2 text-xs opacity-60">{b.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">Atividade recente</h2>
            <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)] text-center text-sm text-[#6B7280]">
              Adicione e mova títulos na watchlist para ver seu histórico de atividade.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
