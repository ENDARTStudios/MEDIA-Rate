"use client";

import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { useAuthStore } from "@/stores/use-auth-store";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardContent() {
  const { user } = useAuthStore();
  const { columns } = useWatchlistStore();
  const total = Object.values(columns).reduce((s, c) => s + c.items.length, 0);
  const completed = columns.completed?.items.length || 0;
  const watching = columns.watching?.items.length || 0;

  if (total === 0) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <h1 className="text-3xl font-display font-bold text-gray-100 mb-4">Dashboard</h1>
        <p className="text-gray-400 mb-6">Adicione títulos à sua watchlist para ver análises e estatísticas.</p>
        <Link href="/catalog"><Button>Explorar catálogo</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-display font-bold text-gray-100 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-surface-card rounded-2xl p-6 border border-surface-border/30">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Total na Watchlist</p>
          <p className="text-5xl font-display font-bold text-gray-100">{total}</p>
          <p className="text-sm text-gray-500 mt-2">títulos</p>
        </div>
        <div className="bg-surface-card rounded-2xl p-6 border border-surface-border/30">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Assistindo Agora</p>
          <p className="text-5xl font-display font-bold text-accent-400">{watching}</p>
          <p className="text-sm text-gray-500 mt-2">em progresso</p>
        </div>
        <div className="bg-surface-card rounded-2xl p-6 border border-surface-border/30">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Completos</p>
          <p className="text-5xl font-display font-bold text-green-400">{completed}</p>
          <p className="text-sm text-gray-500 mt-2">concluídos</p>
        </div>
      </div>

      <div className="bg-surface-card rounded-2xl p-6 border border-surface-border/30">
        <h2 className="text-lg font-display font-semibold text-gray-100 mb-6">Distribuição por Status</h2>
        <div className="space-y-4">
          {(["want", "watching", "completed", "dropped"] as const).map((col) => {
            const count = columns[col]?.items.length || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const colors = { want: "bg-blue-500", watching: "bg-accent-500", completed: "bg-green-500", dropped: "bg-gray-600" };
            return (
              <div key={col}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300 capitalize">{col === "want" ? "Quero ver" : col === "watching" ? "Assistindo" : col === "completed" ? "Completo" : "Abandonado"}</span>
                  <span className="text-gray-400">{count} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${colors[col]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
