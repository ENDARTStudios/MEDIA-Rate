"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/http";

interface Agendado {
  id: string;
  email: string;
  expira_em: string;
}

interface LgpdPainel {
  agendados: Agendado[];
  totalAgendados: number;
  consentimentos: { total: number; analyticsAceito: number; monitoringAceito: number };
}

/**
 * Onda 6 admin (P3) — visão LGPD: exclusões agendadas (carência de 30 dias)
 * com gatilho manual da purga (POST /admin/lgpd/purge — mesmo lote do cron)
 * e contagens de consentimento. Rotas @Roles("ADMIN") no backend.
 */
export default function AdminLgpdPage() {
  const [data, setData] = useState<LgpdPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [purga, setPurga] = useState<{
    verificados: number;
    purgados: number;
    falhas: number;
  } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(() => {
    setErro(null);
    return api
      .get<LgpdPainel>("/api/v1/admin/lgpd")
      .then(setData)
      .catch((e) => {
        setErro(e instanceof Error ? e.message : "Falha ao carregar a visão LGPD.");
      });
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function executarPurga() {
    if (
      !window.confirm(
        "Executar a purga LGPD agora? Usuários com a carência de 30 dias expirada serão ELIMINADOS definitivamente (cascata conforme matriz de propagação).",
      )
    ) {
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      const r = await api.post<{ verificados: number; purgados: number; falhas: number }>(
        "/api/v1/admin/lgpd/purge",
      );
      setPurga(r);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao executar a purga.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        LGPD &amp; Privacidade
      </h1>

      {erro && (
        <p className="mb-4 text-sm text-red-600" role="alert" data-testid="admin-lgpd-erro">
          {erro}
        </p>
      )}

      <section aria-labelledby="purga-title" className="mb-8">
        <h2
          id="purga-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Purga de dados (carência de 30 dias)
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            O cron diário já executa a purga. Este gatilho manual roda o mesmo lote: elimina
            definitivamente usuários com a carência expirada (cascata conforme matriz de
            propagação).
          </p>
          <button
            type="button"
            onClick={() => void executarPurga()}
            disabled={ocupado}
            data-testid="admin-lgpd-purgar"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            {ocupado ? "Executando…" : "Executar purga agora"}
          </button>
          {purga && (
            <p data-testid="admin-lgpd-purga-resultado" className="mt-2 text-sm text-green-600">
              Purga executada — verificados: {purga.verificados}, purgados: {purga.purgados},
              falhas: {purga.falhas}.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="agendados-title" className="mb-8">
        <h2
          id="agendados-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Exclusões agendadas{" "}
          <span className="text-sm font-normal text-gray-500">
            ({data?.totalAgendados ?? 0} na fila)
          </span>
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full" data-testid="admin-lgpd-agendados">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Expira em
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(data?.agendados ?? []).map((a) => (
                <tr key={a.id} data-testid="admin-lgpd-agendado">
                  <td className="px-4 py-2 text-sm">{a.email}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {new Date(a.expira_em).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {data && data.agendados.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-sm text-gray-500">
                    Nenhuma exclusão agendada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="consent-title">
        <h2
          id="consent-title"
          className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100"
        >
          Consentimentos{" "}
          <span className="text-sm font-normal text-gray-500">
            (últimos {data?.consentimentos.total ?? 0} registros)
          </span>
        </h2>
        <dl className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Registros</dt>
            <dd className="text-2xl font-bold" data-testid="admin-consent-total">
              {data?.consentimentos.total ?? 0}
            </dd>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Analytics aceito</dt>
            <dd className="text-2xl font-bold" data-testid="admin-consent-analytics">
              {data?.consentimentos.analyticsAceito ?? 0}
            </dd>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Monitoring aceito</dt>
            <dd className="text-2xl font-bold" data-testid="admin-consent-monitoring">
              {data?.consentimentos.monitoringAceito ?? 0}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
