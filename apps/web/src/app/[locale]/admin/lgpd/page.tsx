"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/http";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { comStepUp } from "@/lib/admin-stepup-client";
import AdminAcessoNegado from "@/components/admin/AdminAcessoNegado";

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

/** T202: negação (403/„sem permissão") substitui TODO o painel — early-return seguro. */
function ehNegacaoAcesso(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 403;
  return e instanceof Error && /permiss/i.test(e.message);
}

/**
 * Onda 6 admin (P3) — visão LGPD: exclusões agendadas (carência de 30 dias)
 * com gatilho manual da purga (POST /admin/lgpd/purge — mesmo lote do cron)
 * e contagens de consentimento. Rotas @Roles("ADMIN") no backend.
 */
export default function AdminLgpdPage() {
  const t = useTranslations("admin");
  const [data, setData] = useState<LgpdPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [negado, setNegado] = useState(false);
  const [purga, setPurga] = useState<{
    verificados: number;
    purgados: number;
    falhas: number;
  } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // D-623: purga confirmada em diálogo acessível.
  const [confirmarPurga, setConfirmarPurga] = useState(false);

  const carregar = useCallback(() => {
    setErro(null);
    return api
      .get<LgpdPainel>("/api/v1/admin/lgpd")
      .then(setData)
      .catch((e) => {
        if (ehNegacaoAcesso(e)) {
          setNegado(true);
          return;
        }
        setErro(e instanceof Error ? e.message : "Falha ao carregar a visão LGPD.");
      });
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function executarPurga() {
    // D-623: confirmação em diálogo acessível (Radix) em vez de `window.confirm` — a purga
    // é irreversível e precisa de foco preso e rótulo explícito.
    setConfirmarPurga(false);
    setOcupado(true);
    setErro(null);
    try {
      const r = await comStepUp(() =>
        api.post<{ verificados: number; purgados: number; falhas: number }>(
          "/api/v1/admin/lgpd/purge",
        ),
      );
      setPurga(r);
      await carregar();
    } catch (e) {
      if (ehNegacaoAcesso(e)) {
        setNegado(true);
        return;
      }
      setErro(e instanceof Error ? e.message : "Falha ao executar a purga.");
    } finally {
      setOcupado(false);
    }
  }

  if (negado) {
    return <AdminAcessoNegado />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ConfirmDialog
        open={confirmarPurga}
        onOpenChange={setConfirmarPurga}
        title={t("purgeTitle")}
        description={t("purgeConfirm")}
        confirmLabel={t("purgeLabel")}
        cancelLabel={t("navBack")}
        variant="destructive"
        onConfirm={() => void executarPurga()}
      />
      <h1 className="text-3xl font-bold mb-6 text-fg-primary">LGPD &amp; Privacidade</h1>

      {erro && (
        <p className="mb-4 text-sm text-score-low" role="alert" data-testid="admin-lgpd-erro">
          {erro}
        </p>
      )}

      <section aria-labelledby="purga-title" className="mb-8">
        <h2 id="purga-title" className="text-xl font-semibold mb-3 text-fg-primary">
          Purga de dados (carência de 30 dias)
        </h2>
        <div className="bg-surface-card rounded-lg shadow-sm p-4">
          <p className="text-sm text-fg-secondary mb-3">
            O cron diário já executa a purga. Este gatilho manual roda o mesmo lote: elimina
            definitivamente usuários com a carência expirada (cascata conforme matriz de
            propagação).
          </p>
          <button
            type="button"
            onClick={() => setConfirmarPurga(true)}
            disabled={ocupado}
            data-testid="admin-lgpd-purgar"
            className="rounded-lg bg-score-low px-4 py-2 text-sm font-semibold text-ink hover:bg-score-low disabled:opacity-40"
          >
            {ocupado ? "Executando…" : "Executar purga agora"}
          </button>
          {purga && (
            <p
              data-testid="admin-lgpd-purga-resultado"
              className="mt-2 text-sm text-accent-emerald"
            >
              Purga executada — verificados: {purga.verificados}, purgados: {purga.purgados},
              falhas: {purga.falhas}.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="agendados-title" className="mb-8">
        <h2 id="agendados-title" className="text-xl font-semibold mb-3 text-fg-primary">
          Exclusões agendadas{" "}
          <span className="text-sm font-normal text-fg-secondary">
            ({data?.totalAgendados ?? 0} na fila)
          </span>
        </h2>
        <div className="bg-surface-card rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full" data-testid="admin-lgpd-agendados">
            <thead>
              <tr className="border-b border-surface-border">
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
                >
                  Expira em
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {(data?.agendados ?? []).map((a) => (
                <tr key={a.id} data-testid="admin-lgpd-agendado">
                  <td className="px-4 py-2 text-sm">{a.email}</td>
                  <td className="px-4 py-2 text-sm text-fg-secondary">
                    {new Date(a.expira_em).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {data && data.agendados.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-sm text-fg-secondary">
                    Nenhuma exclusão agendada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="consent-title">
        <h2 id="consent-title" className="text-xl font-semibold mb-3 text-fg-primary">
          Consentimentos{" "}
          <span className="text-sm font-normal text-fg-secondary">
            (últimos {data?.consentimentos.total ?? 0} registros)
          </span>
        </h2>
        <dl className="grid grid-cols-3 gap-4">
          <div className="bg-surface-card rounded-lg shadow-sm p-4">
            <dt className="text-xs text-fg-secondary">Registros</dt>
            <dd className="text-2xl font-bold" data-testid="admin-consent-total">
              {data?.consentimentos.total ?? 0}
            </dd>
          </div>
          <div className="bg-surface-card rounded-lg shadow-sm p-4">
            <dt className="text-xs text-fg-secondary">Analytics aceito</dt>
            <dd className="text-2xl font-bold" data-testid="admin-consent-analytics">
              {data?.consentimentos.analyticsAceito ?? 0}
            </dd>
          </div>
          <div className="bg-surface-card rounded-lg shadow-sm p-4">
            <dt className="text-xs text-fg-secondary">Monitoring aceito</dt>
            <dd className="text-2xl font-bold" data-testid="admin-consent-monitoring">
              {data?.consentimentos.monitoringAceito ?? 0}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
