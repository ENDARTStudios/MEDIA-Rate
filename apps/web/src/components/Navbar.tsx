"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { LazyLogo } from "./lazy";
import { useAuthStore } from "@/stores/use-auth-store";
import { toast } from "sonner";

export function Navbar() {
  const t = useTranslations("nav");
  const shouldReduce = useReducedMotion();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-sticky border-b transition-all duration-normal ${
        scrolled
          ? "bg-black/90 backdrop-blur-md border-surface-border/50"
          : "bg-black border-surface-border"
      }`}
      aria-label="Navegação principal"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between transition-all duration-normal ${scrolled ? "h-14" : "h-16"}`}>
          <motion.div
            className="flex items-center"
            whileHover={shouldReduce ? undefined : { scale: 1.02 }}
            transition={{ duration: shouldReduce ? 0 : 0.2 }}
          >
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-accent-600 hover:text-accent-500 transition-colors"
              aria-label="MEDIA Rate — Página inicial"
            >
              <LazyLogo className="w-8 h-8" />
              MEDIA Rate
            </Link>
          </motion.div>

          <div className="hidden md:flex items-center space-x-4">
            <Link href="/catalog" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">{t("catalog")}</Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">{t("pricing")}</Link>
            {isAuthenticated ? (
              <div className="relative ml-2">
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-colors">
                  <span className="w-7 h-7 rounded-full bg-accent-500/20 flex items-center justify-center text-xs font-bold text-accent-500">{user?.name?.[0] ?? "?"}</span>
                  <span>{user?.name?.split(" ")[0] ?? "Perfil"}</span>
                </button>
                {menuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-surface-card border border-surface-border/30 rounded-xl shadow-floating py-1 z-dropdown" onMouseLeave={() => setMenuOpen(false)}>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-300 hover:bg-surface-elevated transition-colors">{t("profile")}</Link>
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-300 hover:bg-surface-elevated transition-colors">Dashboard</Link>
                    <Link href="/settings" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-300 hover:bg-surface-elevated transition-colors">Configurações</Link>
                    <Link href="/watchlist" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-300 hover:bg-surface-elevated transition-colors">Watchlist</Link>
                    <hr className="my-1 border-surface-border/30" />
                    <button onClick={() => { logout(); setMenuOpen(false); toast.success("Sessão encerrada"); router.push("/"); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-surface-elevated transition-colors">Sair</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">{t("login")}</Link>
                <Link href="/register" className="bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-400">{t("register")}</Link>
              </>
            )}
            <LocaleSwitcher />
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label="Abrir menu"
              className="text-gray-300 hover:text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
            className="md:hidden"
            initial={shouldReduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={shouldReduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.2, ease: "easeInOut" }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-black border-t border-surface-border">
              <Link href="/catalog" onClick={() => setMobileOpen(false)} className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">{t("catalog")}</Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">{t("pricing")}</Link>
              {isAuthenticated ? (
                <>
                  <Link href="/profile" onClick={() => setMobileOpen(false)} className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">{t("profile")}</Link>
                  <Link href="/watchlist" onClick={() => setMobileOpen(false)} className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">Watchlist</Link>
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="block w-full text-left text-red-400 hover:text-red-300 px-3 py-2 rounded-md text-base font-medium">Sair</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">{t("login")}</Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="block text-accent-600 hover:text-accent-500 font-semibold px-3 py-2 rounded-md text-base">{t("register")}</Link>
                </>
              )}
              <div className="px-3 py-2"><LocaleSwitcher /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
