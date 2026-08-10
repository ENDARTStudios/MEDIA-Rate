"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useInteractionStore } from "@/stores/use-interaction-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { useRouter } from "@/lib/navigation";
import {
  CONSUMO_STATUSES,
  MOTIVOS_ABANDONO,
  REACOES,
  podeTransicionar,
  reacaoEditavelPara,
  type ConsumoStatus,
  type MotivoAbandono,
  type Reacao,
} from "@/lib/api-interactions";
import type { MediaType } from "@/lib/types";
import { AddGlyph, ReactionGlyph, StatusGlyph, statusLabelKey } from "./StatusIcons";

/**
 * StatusReactionControl (T200, Addendum 4) — a interação básica que gera o
 * sinal do motor. Dois eixos independentes: status de consumo + reação.
 *
 * - compact=true  → só o ícone rápido (MediaCard em grids/carrosséis):
 *   1 toque = QUERO_CONSUMIR, sem abrir menu; com status já definido, abre
 *   o popover para avançar o consumo.
 * - compact=false → controle completo (ficha): botão + chevron que abre o
 *   popover com 4 status + 2 reações + motivo de abandono opcional.
 *
 * Ao selecionar CONCLUIDO ou ABANDONADO, habilita e dá foco visual às
 * reações (sem forçar — fechar sem reagir é válido).
 */
export function StatusReactionControl({
  midiaId,
  currentStatus,
  currentReaction,
  mediaType,
  compact = false,
  className = "",
  onRequireAuth,
}: {
  midiaId: string;
  currentStatus?: ConsumoStatus | null;
  currentReaction?: Reacao | null;
  mediaType?: MediaType | string;
  compact?: boolean;
  className?: string;
  onRequireAuth?: () => void;
}) {
  const t = useTranslations("interaction");
  const shouldReduce = useReducedMotion();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const entry = useInteractionStore((s) => s.map[midiaId]);
  const setStatus = useInteractionStore((s) => s.setStatus);
  const setReaction = useInteractionStore((s) => s.setReaction);
  const setMotivo = useInteractionStore((s) => s.setMotivo);
  // T266: erro de escrita exposto (nunca silencioso — D-230).
  const interactionError = useInteractionStore((s) => s.lastError);
  const clearInteractionError = useInteractionStore((s) => s.clearError);

  const status: ConsumoStatus | null = entry?.status ?? currentStatus ?? null;
  const reacao: Reacao | null = entry?.reacao ?? currentReaction ?? null;
  const motivo: MotivoAbandono | null = entry?.motivoAbandono ?? null;

  const [open, setOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ConsumoStatus | null>(status);
  const popoverRef = useRef<HTMLDivElement>(null);

  const canReact = reacaoEditavelPara(status);

  // Sincroniza o status "selecionado no popover" com o atual.
  useEffect(() => {
    setPendingStatus(status);
  }, [status]);

  // Fecha ao clicar fora e ao pressionar Escape (a11y).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Foco inicial no painel quando abre (a11y).
  useEffect(() => {
    if (!open) return;
    const focusable = popoverRef.current?.querySelector<HTMLElement>(
      '[tabindex]:not([tabindex="-1"]), button, [role="radio"]',
    );
    focusable?.focus();
  }, [open]);

  function requireAuth() {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    router.push("/login");
  }

  function handleTap() {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    // 1 toque = QUERO_CONSUMIR, sem abrir menu.
    if (status == null) {
      void setStatus(midiaId, "QUERO_CONSUMIR");
      return;
    }
    clearInteractionError();
    setOpen(true);
  }

  function handleSelectStatus(next: ConsumoStatus) {
    setPendingStatus(next);
    void setStatus(midiaId, next);
    // Sem forçar a reação: abre apenas visualmente (foco) quando o status
    // final permite reagir — fechar sem reagir continua válido.
  }

  function toggleReaction(r: Reacao) {
    void setReaction(midiaId, reacao === r ? null : r);
  }

  function toggleMotivo(m: MotivoAbandono) {
    void setMotivo(midiaId, motivo === m ? null : m);
  }

  // ---- modo compacto: só o ícone rápido ---------------------------------
  if (compact) {
    const labelAtual = status
      ? t(statusLabelKey(mediaType, status))
      : // T249 (C1): sem status, o rótulo principal respeita o vocabulário
        // por tipo — 'Quero Jogar'/'Quero Ver'/'Quero Ler' (antes 'addStatus'
        // genérico 'Quero consumir'/'Want to consume'/'Quiero consumir').
        t(statusLabelKey(mediaType, "QUERO_CONSUMIR"));
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleTap();
        }}
        aria-label={labelAtual}
        title={labelAtual}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          status
            ? "bg-[#11111E]/85 text-[#EDE7DC] hover:bg-[#1C1C2E]"
            : "bg-[#11111E]/85 text-[#9CA3AF] hover:bg-[#1C1C2E] hover:text-[#EDE7DC]"
        } ${className}`}
        data-testid="status-quick"
      >
        {status ? <StatusGlyph status={status} size={16} /> : <AddGlyph size={16} />}
      </button>
    );
  }

  // ---- modo completo: botão + popover -----------------------------------
  // T249 (C1): rótulo principal por tipo quando sem status.
  const displayLabel = status
    ? t(statusLabelKey(mediaType, status))
    : t(statusLabelKey(mediaType, "QUERO_CONSUMIR"));

  return (
    <div ref={popoverRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isAuthenticated) {
            requireAuth();
            return;
          }
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={displayLabel}
        data-testid="status-control-full"
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] ${
          open
            ? "border-[#818CF8] bg-[#1C1C2E] text-[#EDE7DC]"
            : "border-[#2A2A3D] bg-[#11111E] text-[#EDE7DC] hover:bg-[#1C1C2E]"
        }`}
      >
        {status ? <StatusGlyph status={status} size={15} /> : <AddGlyph size={15} />}
        <span>{displayLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.15, ease: "easeOut" }}
          role="dialog"
          aria-label={t("updateStatus")}
          className="absolute left-0 z-popover mt-2 w-56 rounded-xl border border-[#2A2A3D] bg-[#1B1B2C] p-3 shadow-floating"
          data-testid="status-popover"
        >
          {interactionError && (
            <div
              role="alert"
              className="mb-2 rounded-md bg-red-500/10 border border-red-500/30 px-2 py-1.5 text-xs text-red-300"
            >
              {interactionError}
              <button
                type="button"
                onClick={clearInteractionError}
                className="ml-2 underline"
                aria-label={t("dismiss") ?? "Dismiss"}
              >
                ✕
              </button>
            </div>
          )}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#80809B]">
            {t("updateStatus")}
          </p>

          {/* Status (4 opções) */}
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={t("statusGroup")}>
            {CONSUMO_STATUSES.map((s) => {
              const disabled = !podeTransicionar(status, s);
              const active = pendingStatus === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelectStatus(s)}
                  disabled={disabled}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] ${
                    disabled
                      ? "cursor-not-allowed text-[#4A4A60]"
                      : active
                        ? "bg-[#2A2A3D] text-[#EDE7DC]"
                        : "text-[#A0A0B8] hover:bg-[#2A2A3D] hover:text-[#EDE7DC]"
                  }`}
                >
                  <StatusGlyph status={s} size={13} filled={active} />
                  {t(statusLabelKey(mediaType, s))}
                </button>
              );
            })}
          </div>

          {/* Reações — habilitadas com foco visual só em CONCLUIDO/ABANDONADO */}
          {(pendingStatus === "CONCLUIDO" || pendingStatus === "ABANDONADO" || canReact) && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#80809B]">
                {t("reactOptional")}
              </p>
              <div className="flex gap-1.5" role="group" aria-label={t("reactionGroup")}>
                {REACOES.map((r) => {
                  const active = reacao === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleReaction(r)}
                      aria-pressed={active}
                      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] ${
                        active
                          ? "border-[#818CF8] bg-[#2A2A3D] text-[#EDE7DC]"
                          : "border-[#2A2A3D] text-[#A0A0B8] hover:bg-[#2A2A3D]"
                      }`}
                    >
                      <ReactionGlyph reacao={r} size={14} />
                      {t(r === "GOSTEI" ? "gostei" : "naoGostei")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Motivo de abandono — opcional, só quando status = ABANDONADO */}
          {(pendingStatus === "ABANDONADO" || status === "ABANDONADO") && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#80809B]">
                {t("motivoOpcional")}
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("motivoGroup")}>
                {MOTIVOS_ABANDONO.map((m) => {
                  const active = motivo === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMotivo(m)}
                      aria-pressed={active}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] ${
                        active
                          ? "border-[#818CF8] bg-[#2A2A3D] text-[#EDE7DC]"
                          : "border-[#2A2A3D] text-[#A0A0B8] hover:bg-[#2A2A3D]"
                      }`}
                    >
                      {t(`motivo_${m.toLowerCase()}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="mt-3 text-[11px] text-[#6B6B85]">{t("optionalHint")}</p>
        </motion.div>
      )}
    </div>
  );
}
