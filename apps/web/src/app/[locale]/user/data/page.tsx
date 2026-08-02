"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";

export default function UserDataPage() {
  const t = useTranslations("lgpd");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportedData, setExportedData] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleExport() {
    setExporting(true);
    setMessage(null);
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

  async function handleDeleteConfirmed() {
    setShowConfirm(false);
    setDeleting(true);
    setMessage(null);
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
      <h1 className="text-3xl font-bold mb-8 text-gray-100">Seus Dados</h1>

      <section className="space-y-6">
        <div className="bg-surface-card rounded-lg shadow-surface-1 p-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-100">{t("exportData")}</h2>
          <p className="text-sm text-gray-400 mb-4">
            Baixe todos os dados pessoais que temos sobre você em formato JSON.
          </p>
          <Button onClick={handleExport} disabled={exporting} variant="default">
            {exporting ? "..." : t("exportData")}
          </Button>
          {exportedData != null && (
            <pre
              className="mt-4 p-4 bg-surface-elevated rounded-md text-xs overflow-x-auto text-gray-300 border border-surface-border"
              aria-label="Dados exportados"
            >
              {JSON.stringify(exportedData, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-surface-card rounded-lg shadow-surface-1 p-6 border-l-4 border-red-500">
          <h2 className="text-xl font-semibold mb-2 text-gray-100">{t("deleteData")}</h2>
          <p className="text-sm text-gray-400 mb-4">{t("deleteWarning")}</p>
          <Button onClick={() => setShowConfirm(true)} disabled={deleting} variant="destructive">
            {deleting ? "..." : t("confirmDelete")}
          </Button>
        </div>

        {message && (
          <div
            role="alert"
            className="p-4 bg-surface-elevated rounded-md text-sm text-gray-100 border border-surface-border"
          >
            {message}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={t("confirmDelete")}
        description={t("deleteWarning")}
        confirmLabel={t("confirmDelete")}
        cancelLabel="Cancelar"
        onConfirm={handleDeleteConfirmed}
        variant="destructive"
      />
    </div>
  );
}
