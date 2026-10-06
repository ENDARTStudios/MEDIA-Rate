"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/http";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Stats {
  usuarios: { total: number; ativos_7d: number; banidos: number; excluidas: number };
  midias: { total: number; por_tipo: Record<string, number> };
  watchlists: { total_entries: number; usuarios_com_watchlist: number };
  sessoes: { ativas: number };
  planos: { free: number; plus: number; premium: number };
  descobertas: { total_eventos: number; usuarios_com_evento: number };
  interacoes: { total: number };
  interacoes_por_tipo: Record<string, number>;
  evolucao: { mes: string; novos_usuarios: number; interacoes: number }[];
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

      {/* Onda 8: seção USUÁRIOS separada da seção INTERAÇÃO */}
      <section aria-labelledby="usuarios-title" className="mb-8">
        <h2
          id="usuarios-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Usuários
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Kpi label="Total de usuários" valor={data.usuarios.total} />
          <Kpi
            label="Usuários ativos"
            valor={data.usuarios.ativos_7d}
            extra="login nos últimos 7 dias"
          />
          <Kpi label="Usuários banidos" valor={data.usuarios.banidos} />
          <Kpi
            label="Contas excluídas"
            valor={data.usuarios.excluidas}
            extra="eliminações LGPD concluídas"
          />
          <Kpi
            label="Conversão paga"
            valor={`${conversao}%`}
            extra={`${data.planos.plus + data.planos.premium} contas pagas de ${contasComPlano}`}
          />
        </dl>
      </section>

      <section aria-labelledby="interacao-title" className="mb-8">
        <h2
          id="interacao-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Interação com o site
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Kpi
            label="Interações de consumo"
            valor={data.interacoes.total}
            extra="quero + consumindo + concluído"
          />
          <Kpi label="Títulos no catálogo" valor={data.midias.total} />
          <Kpi label="Sessões ativas" valor={data.sessoes.ativas} />
          <Kpi
            label="Descobertas geradas"
            valor={data.descobertas.total_eventos}
            extra={`${data.descobertas.usuarios_com_evento} usuários`}
          />
        </dl>
      </section>

      <section aria-labelledby="graficos-title" className="mb-8">
        <h2
          id="graficos-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Atividade por mês (12 meses)
        </h2>
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
          data-testid="admin-metricas-grafico-atividade"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#37415155" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="novos_usuarios"
                  name="Novos usuários"
                  stroke="#818CF8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="interacoes"
                  name="Interações"
                  stroke="#34D399"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section aria-labelledby="interesse-title" className="mb-8">
        <h2
          id="interesse-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Mídias com mais interesse (interações por tipo)
        </h2>
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
          data-testid="admin-metricas-grafico-interesse"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(data.interacoes_por_tipo).map(([tipo, n]) => ({
                  tipo,
                  interacoes: n,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#37415155" />
                <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="interacoes" fill="#34D399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section aria-labelledby="grafico-catalogo-title" className="mb-8">
        <h2
          id="grafico-catalogo-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Catálogo por tipo
        </h2>
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
          data-testid="admin-metricas-grafico-catalogo"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(data.midias.por_tipo).map(([tipo, n]) => ({
                  tipo,
                  titulos: n,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#37415155" />
                <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="titulos" fill="#818CF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
