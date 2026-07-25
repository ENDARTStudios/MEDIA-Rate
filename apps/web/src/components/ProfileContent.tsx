"use client";

import { useAuthStore } from "@/stores/use-auth-store";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { getGenreDistribution } from "@/lib/media-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ProfileContent() {
  const { user } = useAuthStore();
  const { columns } = useWatchlistStore();
  const allIds = Object.values(columns).flatMap((c) => c.items);
  const total = allIds.length;
  const completed = columns.completed?.items.length || 0;
  const watching = columns.watching?.items.length || 0;
  const dropped = columns.dropped?.items.length || 0;
  const genres = total > 0 ? getGenreDistribution(allIds) : [];

  const badges = [
    { name: "Explorador", desc: "5+ títulos na watchlist", unlocked: total >= 5 },
    { name: "Maratonista", desc: "3+ séries completas", unlocked: completed >= 3 },
    { name: "Ativo", desc: "Assistindo 1+ título", unlocked: watching >= 1 },
  ];

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-12">
        <div className="w-16 h-16 rounded-full bg-accent-500/20 flex items-center justify-center text-2xl font-display font-bold text-accent-500 shrink-0">
          {user?.name?.[0] ?? "?"}
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-100">{user?.name ?? "Usuário"}</h1>
          <p className="text-sm text-gray-400">Plano Free · Membro desde Jan 2026</p>
          {total > 0 && <p className="text-xs text-gray-500 mt-1">{total} títulos · ~{completed * 2}h estimadas</p>}
        </div>
      </div>

      {total === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-4">Adicione títulos à sua watchlist para ver estatísticas e badges.</p>
          <Link href="/catalog"><Button variant="outline">Explorar catálogo</Button></Link>
        </div>
      )}

      {/* Stats */}
      {total > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[{ label: "Na watchlist", value: total }, { label: "Completos", value: completed }, { label: "Assistindo", value: watching }, { label: "Abandonados", value: dropped }].map(({ label, value }) => (
              <div key={label} className="bg-surface-card rounded-2xl p-5 text-center">
                <p className="text-3xl font-display font-bold text-gray-100 tabular-nums">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Taste Profile */}
          {genres.length > 0 && (
            <div className="mb-12">
              <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Taste Profile</h2>
              <div className="bg-surface-card rounded-2xl p-6 border border-surface-border/30 space-y-3">
                {genres.map(({ genre, pct }, i) => (
                  <div key={genre}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{genre}</span>
                      <span className="text-gray-400 tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                      <div className="h-full rounded-full bg-accent-500/60" style={{ width: `${pct}%`, transition: "width 0.8s ease-out" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="mb-12">
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Badges</h2>
            <div className="flex flex-wrap gap-3">
              {badges.map((b) => (
                <div key={b.name} className={`px-4 py-2 rounded-full text-sm font-medium border ${b.unlocked ? "bg-accent-500/10 border-accent-500/30 text-accent-400" : "bg-surface-card border-surface-border/30 text-gray-600"}`}>
                  {b.unlocked ? "★" : "☆"} {b.name}
                  <span className="ml-2 text-xs opacity-60">{b.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Atividade recente */}
          <div>
            <h2 className="text-lg font-display font-semibold text-gray-100 mb-4">Atividade recente</h2>
            <div className="bg-surface-card rounded-2xl p-6 border border-surface-border/30 text-center text-sm text-gray-500">
              Adicione e mova títulos na watchlist para ver seu histórico de atividade.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
