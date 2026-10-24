"use client";

import { useTranslations } from "next-intl";
import { useReducedMotionPref } from "@/lib/useReducedMotionPref";
import { useState, useEffect, useRef } from "react";
import { Link } from "@/lib/navigation";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";
import { SearchCommand } from "./SearchCommand";
import { GradientMenu } from "./ui/gradient-menu";
import { useAuthStore } from "@/stores/use-auth-store";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { NotificationBell } from "./NotificationBell";
import { PlanBadge } from "./ui/PlanBadge";
import { toast } from "sonner";

const NAV_ITEMS = [
  { label: "catalog", href: "/catalog" },
  { label: "top", href: "/top" },
  // D-648: "Descobertas" fecha os quatro links do conceito (a rota já existia no menu do usuário).
  { label: "discoveries", href: "/discoveries" },
  { label: "pricing", href: "/pricing" },
];

export function Navbar({
  initialAuth,
}: {
  initialAuth?: { isAuthenticated: boolean; userName: string | null };
}) {
  const t = useTranslations("nav");
  // D-584/M3 (T211): o padrão "useState + matchMedia + listener" (repetido em
  // text-marquee e vertical-marquee) foi substituído pelo hook canônico.
  const reduce = useReducedMotionPref();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, setInitialUser } = useAuthStore();
  // D-630: a área /admin não tinha entrada na interface (só link direto). O hook consulta o
  // gate uma vez por sessão; a barreira real continua sendo o gate server-side de /admin.
  const isAdmin = useIsAdmin();
  const { fetchWatchlist, entries: wlEntries } = useWatchlistStore();

  // Use server-provided auth state for initial SSR render (eliminates flash)
  const effectiveAuth = initialAuth?.isAuthenticated || isAuthenticated;
  const effectiveUser = initialAuth?.isAuthenticated
    ? { name: initialAuth.userName || "", email: "", id: "ssr", avatarUrl: null }
    : user;

  // Seed store with server-side auth state so subsequent renders use store
  useEffect(() => {
    if (initialAuth?.isAuthenticated) {
      setInitialUser(initialAuth.userName || "");
    }
  }, []);

  // T135: Eagerly fetch watchlist ONCE as soon as auth is confirmed
  const hasFetchedWl = useRef(false);
  useEffect(() => {
    if (effectiveAuth && !hasFetchedWl.current && wlEntries.length === 0) {
      hasFetchedWl.current = true;
      fetchWatchlist().catch(() => undefined);
    }
  }, [effectiveAuth, wlEntries.length, fetchWatchlist]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      data-authed={effectiveAuth ? "1" : undefined}
      className={`sticky top-0 z-sticky border-b transition-[background-color,border-color,box-shadow] duration-normal ${
        scrolled
          ? "bg-[#09090F]/95 backdrop-blur-md border-[rgba(129,140,248,0.08)]"
          : "bg-[#09090F] border-[rgba(129,140,248,0.06)]"
      }`}
      aria-label={t("mainNav")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between ${scrolled ? "h-14" : "h-16"}`}>
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <Link
              href="/"
              className="flex items-center transition-colors"
              aria-label={t("homeAria")}
            >
              <Logo variant="inline" size="sm" />
            </Link>
          </motion.div>

          {/* D-660: era `md:flex`. Em 768 px a barra desktop nao cabe (773 px de
              conteudo + marca = 865 px de scrollWidth, overflow horizontal real
              medido pelo visual-qa em TODAS as rotas). O desktop entra em lg; abaixo
              disso o menu hamburguer assume. */}
          <div className="hidden xl:flex items-center space-x-4">
            <SearchCommand />
            <GradientMenu
              items={NAV_ITEMS.map((item) => ({
                label: t(item.label) ?? item.label,
                href: item.href,
              }))}
            />
            {effectiveAuth ? (
              <>
                <NotificationBell />
                <div className="relative ml-2">
                  {/* T211 (a11y): o menu só fechava em `onMouseLeave` — usuário de
                      teclado/leitor de tela ficava preso com o painel aberto. Agora
                      expõe `aria-expanded`/`aria-haspopup` e fecha em Escape,
                      clique fora e perda de foco (mesmo padrão do LocaleSwitcher). */}
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label={effectiveUser?.name ?? t("profile")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#A0A0B8] hover:text-[#F5F5F7] transition-colors"
                  >
                    <span className="relative w-7 h-7 rounded-full bg-[#818CF8]/20 flex items-center justify-center text-xs font-bold text-[#818CF8] shrink-0">
                      {effectiveUser?.name?.[0] ?? "?"}
                      <PlanBadge plan={user?.plan} />
                    </span>
                    <span className="min-w-[40px]">
                      {effectiveUser?.name?.split(" ")[0] ?? t("profile")}
                    </span>
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setMenuOpen(false);
                      }}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setMenuOpen(false);
                        }
                      }}
                      className="absolute top-full right-0 mt-1 w-48 bg-[#12121C] border border-[rgba(129,140,248,0.12)] rounded-md shadow-floating py-1 z-dropdown"
                      onMouseLeave={() => setMenuOpen(false)}
                    >
                      {/* UAT-40: o popup é de CONTA — quem entra aqui quer saber o
                          plano e agir sobre a sessão. Destinos de produto
                          (listas, watchlist, descobertas, feedback) moram na
                          sidebar do dashboard. */}
                      <div className="px-3 py-2 border-b border-[rgba(129,140,248,0.08)] mb-1">
                        <p className="text-sm font-semibold text-[#F5F5F7] truncate">
                          {effectiveUser?.name ?? t("profile")}
                        </p>
                        {/* Tipo de conta (UAT-40): rótulo próprio do plano, sem
                            tradução — mesmo vocabulário do PlanBadge do avatar. */}
                        <p className="mt-0.5 text-xs text-[#A0A0B8]">
                          {user?.plan === "PREMIUM"
                            ? "Premium"
                            : user?.plan === "PLUS"
                              ? "Plus"
                              : "Free"}
                        </p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-[#A0A0B8] hover:bg-[#1C1C2E] hover:text-[#F5F5F7] transition-colors"
                      >
                        {t("dashboard")}
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-[#A0A0B8] hover:bg-[#1C1C2E] hover:text-[#F5F5F7] transition-colors"
                      >
                        {t("profile")}
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-[#A0A0B8] hover:bg-[#1C1C2E] hover:text-[#F5F5F7] transition-colors"
                      >
                        {t("settings")}
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          data-testid="nav-admin"
                          className="block px-3 py-2 text-sm font-semibold text-[#818CF8] hover:bg-[#1C1C2E] transition-colors"
                        >
                          {t("admin")}
                        </Link>
                      )}
                      <hr className="my-1 border-[rgba(129,140,248,0.08)]" />
                      <button
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                          toast.success(t("sessionEnded"));
                          router.push("/");
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#1C1C2E] transition-colors"
                      >
                        {t("logout")}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[#A0A0B8] hover:text-[#F5F5F7] px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/register"
                  className="bg-[#E11D48] text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-[filter]"
                >
                  {t("register")}
                </Link>
              </>
            )}
            <LocaleSwitcher />
          </div>

          <div className="xl:hidden flex items-center gap-1">
            {/* Entre lg e xl a barra desktop não cabe (foi o overflow de 865 px a
                768 px), mas perder o CTA de cadastro nessa faixa custa conversão em
                notebook: o botão fica, o resto da navegação vai para o menu. */}
            {!effectiveAuth && (
              <Link
                href="/register"
                className="hidden md:inline-flex items-center rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-[filter] hover:brightness-110"
              >
                {t("register")}
              </Link>
            )}
            {effectiveAuth && (
              <div className="xl:hidden">
                <NotificationBell />
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={t("openMenu")}
              className="text-[#A0A0B8] hover:text-[#F5F5F7] p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            className="xl:hidden"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeInOut" }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-[#09090F] border-t border-[rgba(129,140,248,0.08)]">
              <Link
                href="/catalog"
                onClick={() => setMobileOpen(false)}
                className="block text-[#A0A0B8] hover:text-[#F5F5F7] px-3 py-2 rounded-md text-base font-medium"
              >
                {t("catalog")}
              </Link>
              <Link
                href="/top"
                onClick={() => setMobileOpen(false)}
                className="block text-[#A0A0B8] hover:text-[#F5F5F7] px-3 py-2 rounded-md text-base font-medium"
              >
                {t("top")}
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="block text-[#A0A0B8] hover:text-[#F5F5F7] px-3 py-2 rounded-md text-base font-medium"
              >
                {t("pricing")}
              </Link>
              {effectiveAuth ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="block text-[#A0A0B8] hover:text-[#F5F5F7] px-3 py-2 rounded-md text-base font-medium"
                  >
                    {t("profile")}
                  </Link>
                  <Link
                    href="/watchlist"
                    onClick={() => setMobileOpen(false)}
                    className="block text-[#A0A0B8] hover:text-[#F5F5F7] px-3 py-2 rounded-md text-base font-medium"
                  >
                    {t("watchlist")}
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left text-red-400 hover:text-red-300 px-3 py-2 rounded-md text-base font-medium"
                  >
                    {t("logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block text-[#A0A0B8] hover:text-[#F5F5F7] px-3 py-2 rounded-md text-base font-medium"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block text-[#818CF8] hover:text-[#A5B4FC] font-semibold px-3 py-2 rounded-md text-base"
                  >
                    {t("register")}
                  </Link>
                </>
              )}
              <div className="px-3 py-2">
                <LocaleSwitcher />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
