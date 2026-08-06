"use client";

/**
 * LgpdControls (Parte 3.6, T193) — exportação e exclusão LGPD com fluxo de
 * 2 passos: excluir NUNCA acontece em 1 clique — o 1º clique abre a
 * confirmação explícita e o 2º executa (DELETE /api/v1/user/data → 202).
 * A11y: fluxo com role=alert e foco na confirmação; reduced-motion ok.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/http";

export function LgpdControls() {
  const t = useTranslations("dataExport");
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  async function exportar() {
    setBusy("export");
    setError(null);
    try {
      const data = await api.get<unknown>("/api/v1/user/data");
      if (data == null) throw new Error(t("error"));
      const filename = `media-rate-dados-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  async function excluirDefinitivamente() {
    if (!confirmDelete) return;
    setBusy("delete");
    setError(null);
    try {
      await api.delete("/api/v1/user/data");
      setDeleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  if (deleted) {
    return (
      <p className="text-sm text-[#34D399]" role="status">
        {t("deleteRequested")}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void exportar()} disabled={busy != null}>
          {busy === "export" ? "..." : t("downloadJson")}
        </Button>

        {!confirmDelete ? (
          <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={busy != null}>
            {t("deleteData")}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-3" role="alert">
            <span className="text-sm text-[#F87171]">{t("deleteConfirm")}</span>
            <Button
              variant="destructive"
              onClick={() => void excluirDefinitivamente()}
              disabled={busy === "delete"}
            >
              {busy === "delete" ? "..." : t("deleteConfirmYes")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              {t("cancel")}
            </Button>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
