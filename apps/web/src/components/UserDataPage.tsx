"use client";

/**
 * Dados pessoais (LGPD — D-132 export): download do export em JSON e CSV.
 * O endpoint GET /api/v1/user/data (auth) devolve todos os dados do titular.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/use-auth-store";

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Converte o export (objeto aninhado) em CSV de duas colunas. */
function exportToCsv(data: unknown): string {
  const rows: string[][] = [["secao", "conteudo"]];
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      rows.push([esc(k), esc(typeof v === "string" ? v : JSON.stringify(v))]);
    }
  } else {
    rows.push([esc("dados"), esc(String(data))]);
  }
  return rows.map((r) => r.join(",")).join("\n");
}

export function UserDataPage() {
  const t = useTranslations("dataExport");
  const { user } = useAuthStore();
  const [busy, setBusy] = useState<"json" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function baixar(formato: "json" | "csv") {
    setBusy(formato);
    setError(null);
    try {
      const data = await api.get<unknown>("/api/v1/user/data");
      if (data == null) throw new Error(t("error"));
      const filename = `media-rate-dados-${new Date().toISOString().slice(0, 10)}.${formato}`;
      if (formato === "json") {
        download(filename, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      } else {
        download(
          filename,
          new Blob(["\uFEFF" + exportToCsv(data)], { type: "text/csv;charset=utf-8" }),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ProtectedPage>
      <div className="max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-2">{t("title")}</h1>
        <p className="text-sm text-[#A0A0B8] mb-8">{t("description")}</p>

        <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6">
          <p className="text-sm text-[#F5F5F7] mb-1">{user?.email ?? "—"}</p>
          <p className="text-xs text-[#6B6B85] mb-5">{t("includes")}</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void baixar("json")} disabled={busy != null}>
              {busy === "json" ? "..." : t("downloadJson")}
            </Button>
            <Button variant="outline" onClick={() => void baixar("csv")} disabled={busy != null}>
              {busy === "csv" ? "..." : t("downloadCsv")}
            </Button>
          </div>
          {error && (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="text-lg font-heading font-semibold text-[#F87171] mb-2">
            {t("dangerZone")}
          </h2>
          <p className="text-sm text-[#A0A0B8] mb-4">{t("deleteWarning")}</p>
          <Button variant="destructive" disabled>
            {t("deleteData")}
          </Button>
          <p className="mt-2 text-[11px] text-[#6B6B85]">{t("deleteSoon")}</p>
        </div>
      </div>
    </ProtectedPage>
  );
}
