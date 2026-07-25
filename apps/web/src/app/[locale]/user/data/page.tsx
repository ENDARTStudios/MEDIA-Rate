"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  captureDataExportRequested,
  captureDataDeletionRequested,
} from "../../../../lib/posthog-actions";
import { getOrCreateDistinctId } from "../../../../lib/posthog-id";

/**
 * Página de direitos do titular LGPD (T5.4 + T4.9).
 * - Exportar dados: GET /api/v1/user/data
 * - Solicitar exclusão: DELETE /api/v1/user/data
 * - Cancelar exclusão: POST /api/v1/user/data/cancel-exclusion
 */
export default function UserDataPage() {
  const t = useTranslations("lgpd");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportedData, setExportedData] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setMessage(null);
    captureDataExportRequested(getOrCreateDistinctId());
    try {
      const response = await fetch("/api/v1/user/data", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao exportar");
      const data = await response.json();
      setExportedData(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("deleteWarning"))) return;
    setDeleting(true);
    setMessage(null);
    captureDataDeletionRequested(getOrCreateDistinctId());
    try {
      const response = await fetch("/api/v1/user/data", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao agendar exclusão");
      const data = await response.json();
      setMessage(data.mensagem ?? "Exclusão agendada");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">{t("privacy")}</h1>

      <section className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
            {t("exportData")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Baixe todos os dados pessoais que temos sobre você em formato JSON.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-700"
          >
            {exporting ? "..." : t("exportData")}
          </button>
          {exportedData != null && (
            <pre
              className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-md text-xs overflow-x-auto"
              aria-label="Dados exportados"
            >
              {JSON.stringify(exportedData, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-red-500">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
            {t("deleteData")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t("deleteWarning")}</p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            {deleting ? "..." : t("confirmDelete")}
          </button>
        </div>

        {message && (
          <div
            role="alert"
            className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-md text-sm text-primary-700 dark:text-primary-100"
          >
            {message}
          </div>
        )}
      </section>
    </div>
  );
}
