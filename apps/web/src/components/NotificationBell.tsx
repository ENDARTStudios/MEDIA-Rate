"use client";

/**
 * Sino de notificações in-app (D-132 — alertas "score mudou").
 *
 * - Busca GET /api/v1/notificacoes a cada 60s (e ao montar).
 * - Badge com o total de não lidas; dropdown com as mais recentes.
 * - Clicar em uma notificação marca como lida e navega para a mídia.
 */
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { api } from "@/lib/http";
import { useAuthStore } from "@/stores/use-auth-store";
import { cn } from "@/lib/utils";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  midia_id: string | null;
  dados?: { score?: number; score_anterior?: number } | null;
  lida_at: string | null;
  created_at: string;
}

const POLL_MS = 60_000;

export function NotificationBell() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [items, setItems] = useState<Notificacao[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!isAuthenticated) return;
    try {
      const data = await api.get<{ items: Notificacao[]; naoLidas: number }>(
        "/api/v1/notificacoes",
      );
      if (data) {
        setItems(data.items ?? []);
        setUnread(data.naoLidas ?? 0);
      }
    } catch {
      // header não pode quebrar por notificações
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  async function abrirNotificacao(n: Notificacao) {
    setOpen(false);
    if (!n.lida_at) {
      setUnread((u) => Math.max(0, u - 1));
      void api.patch(`/api/v1/notificacoes/${n.id}/lida`, {}).catch(() => undefined);
    }
    if (n.midia_id) router.push(`/media/${n.midia_id}`);
  }

  async function marcarTodas() {
    await api.post("/api/v1/notificacoes/ler", {}).catch(() => undefined);
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, lida_at: n.lida_at ?? new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("label", { count: unread })}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#2A2A3D] bg-[#12121C] text-[#A0A0B8] transition-colors hover:text-[#F5F5F7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E11D48] px-1 text-xs font-bold text-white tabular-nums"
            aria-hidden="true"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-dropdown w-80 rounded-lg border border-[#2A2A3D] bg-[#12121C] shadow-floating"
          role="dialog"
          aria-label={t("title")}
        >
          <div className="flex items-center justify-between border-b border-[#2A2A3D] px-4 py-3">
            <span className="text-sm font-semibold text-[#F5F5F7]">{t("title")}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={marcarTodas}
                className="text-xs text-[#818CF8] hover:text-[#A5B4FC]"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-[#6B6B85]">{t("empty")}</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void abrirNotificacao(n)}
                  className={cn(
                    "block w-full px-4 py-3 text-left transition-colors hover:bg-[#1B1B2C]",
                    !n.lida_at && "bg-[#818CF8]/5",
                  )}
                >
                  <span className="block text-sm font-medium text-[#F5F5F7]">{n.titulo}</span>
                  <span className="mt-0.5 block text-xs text-[#A0A0B8]">{n.mensagem}</span>
                  {n.dados?.score != null && (
                    <span
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
                      style={{
                        backgroundColor:
                          (n.dados.score ?? 0) >= 70
                            ? "rgba(52,211,153,0.15)"
                            : (n.dados.score ?? 0) >= 40
                              ? "rgba(251,191,36,0.15)"
                              : "rgba(248,113,113,0.15)",
                        color:
                          (n.dados.score ?? 0) >= 70
                            ? "#34D399"
                            : (n.dados.score ?? 0) >= 40
                              ? "#FBBF24"
                              : "#F87171",
                      }}
                    >
                      {Math.round(n.dados.score)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
