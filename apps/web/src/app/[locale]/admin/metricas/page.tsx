"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/http";

interface Stats {
  usuarios: { total: number; ativos_7d: number };
  midias: { total: number; por_tipo: Record<string, number> };
  watchlists: { total_entries: number; usuarios_com_watchlist: number };
  sessoes: { ativas: number };
  planos: { free: number; plus: number; premium: number };
  descobertas: { total_eventos: number; usuarios_com_evento: number };
  interacoes: { total: number };
}

function Kpi({ label, valor, extra }: { label: string; valor: string | number; extra?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4" data-testid="admin-metrica">
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-2xl font-bold mt-1">{valor}</dd>
      {extra && <p className="text-xs text-gray-400 mt-1">{extra}</p>}
    </div>
  );
}

/**
 * Onda 5 admin (P2) — métricas reais de operação (KPIs sobre /admin/stats,
 * cache 60s no servidor). Conversão paga = (Plus + Premium) / total de
 * contas com plano.
 */
export default function AdminMetricasPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Stats>("/api/v1/admin/stats")
      .then(setData)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar métricas."));
  }, []);

  if (erro) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-red-600">{erro}</div>;
  }
  if (!data) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-gray-500">Carregando…</div>;
  }

  const contasComPlano = data.planos.free + data.planos.plus + data.planos.premium;
  const conversao =
    contasComPlano > 0
      ? Math.round(((data.planos.plus + data.planos.premium) / contasComPlano) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Métricas</h1>

      <section aria-labelledby="kpi-title" className="mb-8">
        <h2 id="kpi-title" className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
          KPIs
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Kpi
            label="Usuários (não excluídos)"
            valor={data.usuarios.total}
            extra={`${data.usuarios.ativos_7d} ativos nos últimos 7 dias`}
          />
          <Kpi
            label="Interações de consumo"
            valor={data.interacoes.total}
            extra="quero + consumindo + concluído"
          />
          <Kpi label="Títulos no catálogo" valor={data.midias.total} />
          <Kpi
            label="Conversão paga"
            valor={`${conversao}%`}
            extra={`${data.planos.plus + data.planos.premium} contas pagas de ${contasComPlano}`}
          />
          <Kpi label="Sessões ativas" valor={data.sessoes.ativas} />
          <Kpi
            label="Descobertas geradas"
            valor={data.descobertas.total_eventos}
            extra={`${data.descobertas.usuarios_com_evento} usuários`}
          />
        </dl>
      </section>

      <section aria-labelledby="planos-title" className="mb-8">
        <h2
          id="planos-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Planos ativos
        </h2>
        <dl className="grid grid-cols-3 gap-4">
          <Kpi label="Free" valor={data.planos.free} />
          <Kpi label="Plus" valor={data.planos.plus} />
          <Kpi label="Premium" valor={data.planos.premium} />
        </dl>
      </section>

      <section aria-labelledby="catalogo-title" className="mb-8">
        <h2
          id="catalogo-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Catálogo por tipo
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(data.midias.por_tipo).map(([tipo, n]) => (
            <Kpi key={tipo} label={tipo} valor={n} />
          ))}
        </dl>
      </section>

      <section aria-labelledby="watchlist-title">
        <h2
          id="watchlist-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Watchlist
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <Kpi label="Entradas totais" valor={data.watchlists.total_entries} />
          <Kpi label="Usuários com watchlist" valor={data.watchlists.usuarios_com_watchlist} />
        </dl>
      </section>
    </div>
  );
}
