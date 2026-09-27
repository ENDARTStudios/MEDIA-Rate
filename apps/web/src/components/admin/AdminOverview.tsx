"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/http";

interface AdminStats {
  usuarios: { total: number; ativos_7d: number };
  midias: { total: number; por_tipo: Record<string, number> };
  watchlists: { total_entries: number; usuarios_com_watchlist: number };
  sessoes: { ativas: number };
  planos: { free: number; plus: number; premium: number };
}

/**
 * BETA-GAP-03 / T119 — overview admin REAL (somente leitura).
 *
 * Acesso restrito a ADMIN no backend (@Roles('ADMIN')); 401/403 vira estado
 * honesto na UI (nunca mock). Não expõe PII: apenas contagens agregadas.
 * Mesmo padrão do painel de diagnostics (`/admin/diagnostics`).
 */
export function AdminOverview() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .get<AdminStats>("/api/v1/admin/stats")
      .then((d) => {
        if (ativo) setData(d);
      })
      .catch((e) => {
        if (ativo)
          setErro(
            e instanceof Error && e.message ? e.message : "Falha ao carregar o painel admin.",
          );
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (erro) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-7xl px-4 py-16 text-sm text-red-600 sm:px-6 lg:px-8"
      >
        {erro}
      </div>
    );
  }

  if (!data) {
    return (
      <div
        role="status"
        className="mx-auto max-w-7xl px-4 py-16 text-sm text-gray-600 sm:px-6 lg:px-8"
      >
        Carregando…
      </div>
    );
  }

  const planoCard = (label: string, valor: number, destaque: boolean) => (
    <div key={label} className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`text-3xl font-bold ${destaque ? "text-[#8b7cff]" : "text-gray-900 dark:text-gray-100"}`}
      >
        {valor}
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-gray-100">
        Painel administrativo
      </h1>

      <section aria-labelledby="metrics-title" className="mb-8">
        <h2
          id="metrics-title"
          className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100"
        >
          Métricas
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {planoCard("Total de usuários", data.usuarios.total, false)}
          {planoCard("Ativos (7 dias)", data.usuarios.ativos_7d, false)}
          {planoCard("Mídias", data.midias.total, false)}
          {planoCard("Sessões ativas", data.sessoes.ativas, false)}
        </div>
      </section>

      <section aria-labelledby="plans-title" className="mb-8">
        <h2
          id="plans-title"
          className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100"
        >
          Planos
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {planoCard("Free", data.planos.free, false)}
          {planoCard("Plus", data.planos.plus, true)}
          {planoCard("Premium", data.planos.premium, true)}
        </div>
      </section>

      <section aria-labelledby="watchlists-title">
        <h2
          id="watchlists-title"
          className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100"
        >
          Watchlists
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {planoCard("Itens na watchlist", data.watchlists.total_entries, false)}
          {planoCard("Usuários com watchlist", data.watchlists.usuarios_com_watchlist, false)}
          {Object.entries(data.midias.por_tipo).map(([tipo, total]) =>
            planoCard(tipo, total, false),
          )}
        </div>
      </section>
    </div>
  );
}
