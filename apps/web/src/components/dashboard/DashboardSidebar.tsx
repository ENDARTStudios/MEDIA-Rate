"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  History,
  Home,
  Library,
  ListChecks,
  MessageSquareText,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Link, usePathname } from "@/lib/navigation";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/use-auth-store";

/**
 * Mapas de navegação exportados para o teste de mapa de rotas
 * (T460/Thinker: toda href da sidebar precisa existir como página).
 *
 * UAT-40: Listas, Watchlist, Perfil, Configurações, Enviar feedback e
 * Descobertas moram AQUI (o popup do usuário na barra superior ficou só com
 * conta/navegação de conta — os destinos de produto são alcançados pela sidebar).
 */
export const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "navOverview", icon: Home },
  { href: "/dashboard/discoveries", labelKey: "navDiscoveries", icon: Compass },
  { href: "/listas", labelKey: "navListas", icon: ListChecks },
  { href: "/watchlist", labelKey: "navWatchlist", icon: Bookmark },
  { href: "/biblioteca", labelKey: "navLibrary", icon: Library },
  // UAT-41: o destino é o histórico de mídias — o rótulo agora diz isso (o
  // antigo "Metas e evolução" prometia uma página de metas que não existia).
  { href: "/historico", labelKey: "navHistory", icon: History },
] as const;

export const ACCOUNT_ITEMS = [
  { href: "/profile", labelKey: "navProfile", icon: UserRound },
  { href: "/settings", labelKey: "navSettings", icon: Settings },
  { href: "/feedback", labelKey: "navFeedback", icon: MessageSquareText },
] as const;

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "MR";
  return (partes[0][0] + (partes[partes.length - 1]?.[0] ?? "")).toUpperCase();
}

/**
 * Sidebar do protótipo `media-rate-dashboard`, adaptada ao shell global
 * (Navbar sticky do app): coluna sticky abaixo do header em telas lg+.
 */
export function DashboardSidebar() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  // D-630: entrada da área administrativa (só aparece para ADMIN).
  const isAdmin = useIsAdmin();
  const tNav = useTranslations("nav");
  const [compact, setCompact] = useState(false);
  const user = useAuthStore((s) => s.user);

  const planKey =
    user?.plan === "PREMIUM" ? "planPremium" : user?.plan === "PLUS" ? "planPlus" : "planFree";

  return (
    <aside
      data-testid="dashboard-sidebar"
      aria-label={t("navSpace")}
      className={`sticky top-24 hidden h-[calc(100dvh-7rem)] shrink-0 flex-col rounded-2xl border border-white/[0.07] bg-dash-deeper lg:flex ${compact ? "w-[80px]" : "w-[230px]"}`}
    >
      <div
        className={`flex h-[64px] items-center border-b border-white/[0.07] ${compact ? "justify-center px-3" : "justify-between px-5"}`}
      >
        {!compact && (
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-dash-indigo text-[#0c0c12]">
              <Sparkles size={16} strokeWidth={2.7} />
            </div>
            <div className="leading-none">
              <span className="block text-[13px] font-black tracking-[-0.04em] text-white">
                MEDIA
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.14em] text-white/45">
                RATE
              </span>
            </div>
          </div>
        )}
        {compact && (
          <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-dash-indigo text-[#0c0c12]">
            <Sparkles size={16} strokeWidth={2.7} />
          </div>
        )}
        <button
          type="button"
          onClick={() => setCompact((v) => !v)}
          className="rounded-lg p-2 text-fg-muted transition hover:bg-white/[0.06] hover:text-white"
          aria-label={t("navCollapse")}
        >
          {compact ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <div className="flex-1 px-3 py-5">
        {!compact && (
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-fg-muted">
            {t("navSpace")}
          </p>
        )}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            // D-626: `href` pode conter query string (`/biblioteca?status=…`) e `usePathname` não —
            // comparar cru nunca marcava o item ativo. Agora compara o caminho e anuncia o estado.
            const selected = pathname === item.href.split("?")[0];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${selected ? "bg-dash-indigo/15 text-dash-violet-light" : "text-white/45 hover:bg-white/[0.05] hover:text-white"}`}
              >
                <Icon
                  size={17}
                  className={
                    selected ? "text-dash-violet" : "text-fg-muted group-hover:text-white/70"
                  }
                />
                {!compact && <span className="flex-1">{t(item.labelKey)}</span>}
              </Link>
            );
          })}
          {/* D-630: entrada da área administrativa, só para quem é ADMIN. Fica fora de
              `NAV_ITEMS` de propósito — aquele array é estático e alimenta o teste de mapa de
              rotas; a visibilidade aqui depende do gate, não do mapa. */}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              data-testid="sidebar-admin"
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${pathname === "/admin" ? "bg-dash-indigo/15 text-dash-violet-light" : "text-dash-violet/80 hover:bg-white/[0.05] hover:text-dash-violet-light"}`}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              {!compact && <span className="flex-1">{tNav("admin")}</span>}
            </Link>
          )}
        </nav>
        {!compact && (
          <>
            <div className="my-5 h-px bg-white/[0.07]" />
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-fg-muted">
              {t("navAccount")}
            </p>
            <nav className="space-y-1">
              {ACCOUNT_ITEMS.map((item) => {
                const Icon = item.icon;
                const selected = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={selected ? "page" : undefined}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${selected ? "bg-dash-indigo/15 text-dash-violet-light" : "text-white/45 hover:bg-white/[0.05] hover:text-white"}`}
                  >
                    <Icon
                      size={17}
                      className={
                        selected ? "text-dash-violet" : "text-fg-muted group-hover:text-white/70"
                      }
                    />
                    <span className="flex-1">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>

      <div className={`border-t border-white/[0.07] p-4 ${compact ? "flex justify-center" : ""}`}>
        {compact ? (
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-dash-amber to-dash-coral text-[11px] font-black text-[#351b17]">
            {iniciais(user?.name ?? "")}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-dash-amber to-dash-coral text-[11px] font-black text-[#351b17]">
              {iniciais(user?.name ?? "")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-white">
                {user?.name || t("navGuest")}
              </p>
              <p className="mt-0.5 text-[10px] text-fg-muted">{t(planKey)}</p>
            </div>
            <ChevronRight size={16} className="text-fg-muted" />
          </div>
        )}
      </div>
    </aside>
  );
}
