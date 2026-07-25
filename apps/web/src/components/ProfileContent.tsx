"use client";

import { useAuthStore } from "@/stores/use-auth-store";
import { useWatchlistStore } from "@/stores/use-watchlist-store";

export function ProfileContent() {
  const { user } = useAuthStore();
  const { columns } = useWatchlistStore();
  const total = Object.values(columns).reduce((s, c) => s + c.items.length, 0);
  const completed = columns.completed?.items.length || 0;
  const watching = columns.watching?.items.length || 0;
  const dropped = columns.dropped?.items.length || 0;

  const badges = [
    { name: "Explorador", desc: "5+ títulos na watchlist", unlocked: total >= 5 },
    { name: "Maratonista", desc: "3+ séries completas", unlocked: completed >= 3 },
    { name: "Ativo", desc: "Assistindo 1+ título", unlocked: watching >= 1 },
  ];

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-16 h-16 rounded-full bg-accent-500/20 flex items-center justify-center text-2xl font-display font-bold text-accent-500">
          {user?.name?.[0] ?? "?"}
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-100">{user?.name ?? "Usuário"}</h1>
          <p className="text-sm text-gray-400">Plano Free · Membro desde 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-surface-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-gray-100">{total}</p>
          <p className="text-xs text-gray-400 mt-1">Na watchlist</p>
        </div>
        <div className="bg-surface-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-gray-100">{completed}</p>
          <p className="text-xs text-gray-400 mt-1">Completos</p>
        </div>
        <div className="bg-surface-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-gray-100">{watching}</p>
          <p className="text-xs text-gray-400 mt-1">Assistindo</p>
        </div>
        <div className="bg-surface-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-gray-100">{dropped}</p>
          <p className="text-xs text-gray-400 mt-1">Abandonados</p>
        </div>
      </div>

      {total === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>Adicione títulos à sua watchlist para ver estatísticas e badges.</p>
        </div>
      )}

      {total > 0 && (
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
      )}
    </div>
  );
}
