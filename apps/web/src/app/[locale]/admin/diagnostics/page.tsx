"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/http";

interface Diagnostics {
  server: { node_env: string; versao: string; uptime_segundos: number; agora: string };
  database: { ok: boolean; latencia_ms: number | null };
  feature_flags: { key: string; enabled: boolean; rollout_percent: number }[];
  contagens: { midias: number; usuarios: number };
}

function fmtUptime(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${h}h ${m}m ${s}s`;
}

/**
 * T329 — painel de diagnóstico interno (somente leitura).
 * Acesso restrito a ADMIN no backend (@Roles('ADMIN')); 401/403 vira erro.
 */
export default function DiagnosticsPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .get<Diagnostics>("/api/v1/admin/diagnostics")
      .then((d) => {
        if (ativo) setData(d);
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar diagnóstico");
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (erro) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-red-600">{erro}</div>;
  }
  if (!data) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-gray-600">Carregando…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Diagnóstico</h1>

      <section aria-labelledby="server-title" className="mb-8">
        <h2
          id="server-title"
          className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
        >
          Servidor
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Ambiente</dt>
            <dd className="text-lg font-semibold">{data.server.node_env}</dd>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Versão</dt>
            <dd className="text-lg font-semibold">{data.server.versao}</dd>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Uptime</dt>
            <dd className="text-lg font-semibold">{fmtUptime(data.server.uptime_segundos)}</dd>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Banco</dt>
            <dd className="text-lg font-semibold">
              {data.database.ok ? (
                <span className="text-green-600">{data.database.latencia_ms}ms</span>
              ) : (
                <span className="text-red-600">indisponível</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="counts-title" className="mb-8">
        <h2
          id="counts-title"
          className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
        >
          Contagens
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Mídias</dt>
            <dd className="text-2xl font-bold">{data.contagens.midias}</dd>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Usuários</dt>
            <dd className="text-2xl font-bold">{data.contagens.usuarios}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="flags-title">
        <h2
          id="flags-title"
          className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
        >
          Feature flags
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Chave
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Rollout
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.feature_flags.map((f) => (
                <tr key={f.key}>
                  <td className="px-4 py-2 text-sm">{f.key}</td>
                  <td className="px-4 py-2 text-sm">
                    {f.enabled ? (
                      <span className="text-green-600">on</span>
                    ) : (
                      <span className="text-gray-500">off</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">{f.rollout_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
