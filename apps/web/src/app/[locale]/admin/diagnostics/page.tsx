"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { comStepUp } from "@/lib/admin-stepup-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

interface MidiaRemovida {
  ok?: boolean;
  message?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * T215/B1 — ferramenta de remoção (soft delete) de mídia do catálogo.
 * A rota DELETE /api/v1/midias/:id já valida RBAC ADMIN no backend; aqui
 * exigimos confirmação explícita e exibimos o resultado/erro.
 */
function RemoverMidiaForm() {
  // D-623: texto do diálogo de confirmação vem de i18n (o gate `i18n:source` pegou os
  // literais em português que eu havia preservado — comportamento correto do gate).
  const t = useTranslations("admin");
  const [midiaId, setMidiaId] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [confirmarRemocao, setConfirmarRemocao] = useState<string | null>(null);

  async function remover() {
    const id = midiaId.trim();
    setErro(null);
    setResultado(null);
    if (!UUID_RE.test(id)) {
      setErro("Informe um UUID válido.");
      return;
    }
    // D-623: diálogo acessível em vez de `window.confirm`.
    setConfirmarRemocao(null);
    setOcupado(true);
    try {
      const resp = await api.delete<MidiaRemovida>(`/api/v1/midias/${id}`);
      setResultado(resp?.message ?? "Mídia removida (soft delete).");
      setMidiaId("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover a mídia.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby="admin-remove-title" className="mb-8">
      <ConfirmDialog
        open={confirmarRemocao !== null}
        onOpenChange={(aberto) => !aberto && setConfirmarRemocao(null)}
        title={t("removeMediaTitle")}
        description={t("removeMediaConfirm", { titulo: confirmarRemocao ?? "" })}
        confirmLabel={t("removeMedia")}
        cancelLabel={t("navBack")}
        variant="destructive"
        onConfirm={() => {
          setMidiaId(confirmarRemocao ?? "");
          void remover();
        }}
      />
      <h2 id="admin-remove-title" className="text-xl font-semibold mb-4 text-fg-primary">
        Remover mídia do catálogo (soft delete)
      </h2>
      <div className="bg-surface-card rounded-lg shadow-sm p-4 flex flex-wrap items-center gap-3">
        <input
          value={midiaId}
          onChange={(e) => setMidiaId(e.target.value)}
          placeholder="UUID da mídia"
          data-testid="admin-remove-input"
          aria-label="UUID da mídia a remover"
          className="flex-1 min-w-[16rem] rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm font-mono"
        />
        <button
          type="button"
          onClick={() => {
            const id = midiaId.trim();
            if (!UUID_RE.test(id)) {
              setErro("Informe um UUID válido.");
              return;
            }
            setConfirmarRemocao(id);
          }}
          disabled={ocupado || midiaId.trim() === ""}
          data-testid="admin-remove-button"
          className="rounded-lg bg-score-low px-4 py-2 text-sm font-semibold text-ink transition hover:bg-score-low disabled:opacity-40"
        >
          {ocupado ? "Removendo…" : "Remover"}
        </button>
      </div>
      {resultado && (
        <p data-testid="admin-remove-result" className="mt-2 text-sm text-accent-emerald">
          {resultado}
        </p>
      )}
      {erro && (
        <p data-testid="admin-remove-error" className="mt-2 text-sm text-score-low" role="alert">
          {erro}
        </p>
      )}
    </section>
  );
}

/**
 * T329 — painel de diagnóstico interno (somente leitura).
 * Acesso restrito a ADMIN no backend (@Roles('ADMIN')); 401/403 vira erro.
 */
export default function DiagnosticsPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [flagOcupada, setFlagOcupada] = useState<string | null>(null);

  // Onda 4 admin (P1b): extraído para permitir refetch após o toggle.
  const carregar = useCallback(() => {
    setErro(null);
    return api
      .get<Diagnostics>("/api/v1/admin/diagnostics")
      .then((d) => setData(d))
      .catch((e) => {
        setErro(e instanceof Error ? e.message : "Erro ao carregar diagnóstico");
      });
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /**
   * Onda 4 admin (P1b): liga/desliga a flag via PATCH /admin/flags/:key
   * (audit FLAG_UPDATE no serviço) e refresca o painel.
   */
  async function alternarFlag(key: string, enabled: boolean) {
    setFlagOcupada(key);
    try {
      await comStepUp(() => api.patch(`/api/v1/admin/flags/${key}`, { enabled: !enabled }));
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao atualizar a flag.");
    } finally {
      setFlagOcupada(null);
    }
  }

  if (erro) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-score-low">{erro}</div>;
  }
  if (!data) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-fg-secondary">Carregando…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8 text-fg-primary">Diagnóstico</h1>

      <RemoverMidiaForm />

      <section aria-labelledby="server-title" className="mb-8">
        <h2 id="server-title" className="text-xl font-semibold mb-4 text-fg-primary">
          Servidor
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-card rounded-lg shadow-sm p-4">
            <dt className="text-xs text-fg-secondary">Ambiente</dt>
            <dd className="text-lg font-semibold">{data.server.node_env}</dd>
          </div>
          <div className="bg-surface-card rounded-lg shadow-sm p-4">
            <dt className="text-xs text-fg-secondary">Versão</dt>
            <dd className="text-lg font-semibold">{data.server.versao}</dd>
          </div>
          <div className="bg-surface-card rounded-lg shadow-sm p-4">
            <dt className="text-xs text-fg-secondary">Uptime</dt>
            <dd className="text-lg font-semibold">{fmtUptime(data.server.uptime_segundos)}</dd>
          </div>
          <div className="bg-surface-card rounded-lg shadow-sm p-4">
            <dt className="text-xs text-fg-secondary">Banco</dt>
            <dd className="text-lg font-semibold">
              {data.database.ok ? (
                <span className="text-accent-emerald">{data.database.latencia_ms}ms</span>
              ) : (
                <span className="text-score-low">indisponível</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="counts-title" className="mb-8">
        <h2 id="counts-title" className="text-xl font-semibold mb-4 text-fg-primary">
          Contagens
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <div className="bg-surface-card rounded-lg shadow-sm p-4">
            <dt className="text-xs text-fg-secondary">Mídias</dt>
            <dd className="text-2xl font-bold">{data.contagens.midias}</dd>
          </div>
          <div className="bg-surface-card rounded-lg shadow-sm p-4">
            <dt className="text-xs text-fg-secondary">Usuários</dt>
            <dd className="text-2xl font-bold">{data.contagens.usuarios}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="flags-title">
        <h2 id="flags-title" className="text-xl font-semibold mb-4 text-fg-primary">
          Feature flags
        </h2>
        <div className="bg-surface-card rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-surface-border">
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
                >
                  Chave
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
                >
                  Estado
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
                >
                  Rollout
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
                >
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.feature_flags.map((f) => (
                <tr key={f.key}>
                  <td className="px-4 py-2 text-sm">{f.key}</td>
                  <td className="px-4 py-2 text-sm">
                    {f.enabled ? (
                      <span className="text-accent-emerald">on</span>
                    ) : (
                      <span className="text-fg-secondary">off</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">{f.rollout_percent}%</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => void alternarFlag(f.key, f.enabled)}
                      disabled={flagOcupada === f.key}
                      data-testid={`admin-flag-toggle-${f.key}`}
                      className="rounded-lg border border-surface-border px-3 py-1 text-xs font-medium text-fg-primary hover:bg-surface-elevated disabled:opacity-40"
                    >
                      {flagOcupada === f.key ? "…" : f.enabled ? "Desligar" : "Ligar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
