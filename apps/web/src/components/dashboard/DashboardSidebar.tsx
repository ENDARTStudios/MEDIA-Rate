"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  History,
  Home,
  Library,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { Link, usePathname } from "@/lib/navigation";
import { useAuthStore } from "@/stores/use-auth-store";

/**
 * Mapas de navegação exportados para o teste de mapa de rotas
 * (T460/Thinker: toda href da sidebar precisa existir como página).
 */
export const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "navOverview", icon: Home },
  { href: "/dashboard/discoveries", labelKey: "navDiscoveries", icon: Compass },
  { href: "/biblioteca", labelKey: "navLibrary", icon: Library },
  { href: "/historico", labelKey: "navGoals", icon: History },
] as const;

export const SHORTCUTS = [
  {
    href: "/biblioteca?status=QUERO_CONSUMIR",
    labelKey: "navWantToSee",
    icon: Bookmark,
  },
  { href: "/listas", labelKey: "navFavorites", icon: Heart },
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
  const [compact, setCompact] = useState(false);
  const user = useAuthStore((s) => s.user);

  const planKey =
    user?.plan === "PREMIUM" ? "planPremium" : user?.plan === "PLUS" ? "planPlus" : "planFree";

  return (
    <aside
      data-testid="dashboard-sidebar"
      aria-label={t("navSpace")}
      className={`sticky top-24 hidden h-[calc(100vh-7rem)] shrink-0 flex-col rounded-2xl border border-white/[0.07] bg-[#0b0b12] lg:flex ${compact ? "w-[80px]" : "w-[230px]"}`}
    >
      <div
        className={`flex h-[64px] items-center border-b border-white/[0.07] ${compact ? "justify-center px-3" : "justify-between px-5"}`}
      >
        {!compact && (
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#8b7cff] text-[#0c0c12]">
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
          <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#8b7cff] text-[#0c0c12]">
            <Sparkles size={16} strokeWidth={2.7} />
          </div>
        )}
        <button
          type="button"
          onClick={() => setCompact((v) => !v)}
          className="rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
          aria-label={t("navCollapse")}
        >
          {compact ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <div className="flex-1 px-3 py-5">
        {!compact && (
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
            {t("navSpace")}
          </p>
        )}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${selected ? "bg-[#8b7cff]/15 text-[#b9b0ff]" : "text-white/45 hover:bg-white/[0.05] hover:text-white"}`}
              >
                <Icon
                  size={17}
                  className={
                    selected ? "text-[#9b8cff]" : "text-white/40 group-hover:text-white/70"
                  }
                />
                {!compact && <span className="flex-1">{t(item.labelKey)}</span>}
              </Link>
            );
          })}
        </nav>
        {!compact && (
          <>
            <div className="my-5 h-px bg-white/[0.07]" />
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              {t("navShortcuts")}
            </p>
            <nav className="space-y-1">
              {SHORTCUTS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.labelKey}
                    href={item.href}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold text-white/45 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <Icon size={17} className="text-white/40 group-hover:text-white/70" />
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
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#f2c36b] to-[#ff7f66] text-[11px] font-black text-[#351b17]">
            {iniciais(user?.name ?? "")}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f2c36b] to-[#ff7f66] text-[11px] font-black text-[#351b17]">
              {iniciais(user?.name ?? "")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-white">
                {user?.name || t("navGuest")}
              </p>
              <p className="mt-0.5 text-[10px] text-white/35">{t(planKey)}</p>
            </div>
            <MoreHorizontal size={16} className="text-white/35" />
          </div>
        )}
      </div>
    </aside>
  );
}
