"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { ADMIN_STEPUP_REQUIRED_EVENT } from "@/lib/admin-stepup-client";

type Resolver = (senha: string | null) => void;

/**
 * T205 Fase 1 — diálogo de step-up por senha (montado no AdminShell).
 * Escuta ADMIN_STEPUP_REQUIRED_EVENT: pede a senha atual do admin, chama
 * POST /api/v1/admin/step-up (CSRF via client) e resolve a Promise com a senha
 * OU com null (cancelamento). A senha vive só no estado efêmero do input
 * (nunca em storage/logs). Acessibilidade: label associado, foco inicial,
 * Escape cancela, aria-live no erro, botões desabilitados durante a chamada.
 */
export default function AdminStepUpDialog() {
  const t = useTranslations("admin");
  const [resolver, setResolver] = useState<Resolver | null>(null);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  useEffect(() => {
    const aoPedir = (evento: Event) => {
      const detail = (evento as CustomEvent<{ resolve: Resolver }>).detail;
      if (!detail?.resolve) return;
      resolverRef.current = detail.resolve;
      setResolver(() => detail.resolve);
      setSenha("");
      setErro(false);
    };
    window.addEventListener(ADMIN_STEPUP_REQUIRED_EVENT, aoPedir);
    return () => window.removeEventListener(ADMIN_STEPUP_REQUIRED_EVENT, aoPedir);
  }, []);

  useEffect(() => {
    if (resolver) inputRef.current?.focus();
  }, [resolver]);

  const fechar = useCallback((senha: string | null) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    setResolver(null);
    setSenha("");
    setErro(false);
    setOcupado(false);
    r?.(senha);
  }, []);

  async function confirmar() {
    if (!resolverRef.current || ocupado) return;
    setOcupado(true);
    setErro(false);
    try {
      await api.post("/api/v1/admin/step-up", { senha });
      fechar(senha); // resolve com a senha — a operação original é repetida pelo wrapper
    } catch {
      setErro(true); // mensagem genérica — nunca revela detalhe técnico
      setOcupado(false);
    }
  }

  if (!resolver) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("stepupTitulo")}
      data-testid="admin-stepup-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !ocupado) fechar(null);
      }}
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("stepupTitulo")}
        </h2>
        <p aria-live="polite" data-testid="admin-stepup-erro" className="mb-2 text-sm text-red-600">
          {erro ? t("stepupErro") : ""}
        </p>
        <label htmlFor="admin-stepup-senha" className="mb-1 block text-sm text-gray-300">
          {t("stepupLabel")}
        </label>
        <input
          ref={inputRef}
          id="admin-stepup-senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          disabled={ocupado}
          data-testid="admin-stepup-senha"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => fechar(null)}
            disabled={ocupado}
            data-testid="admin-stepup-cancelar"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
          >
            {t("stepupCancelar")}
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={ocupado || senha.length === 0}
            data-testid="admin-stepup-confirmar"
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {t("stepupConfirmar")}
          </button>
        </div>
      </div>
    </div>
  );
}
