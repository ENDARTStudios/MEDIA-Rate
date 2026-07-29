"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Link } from "@/lib/navigation";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";
import { SearchCommand } from "./SearchCommand";
import { GradientMenu } from "./ui/gradient-menu";
import { useAuthStore } from "@/stores/use-auth-store";
import { toast } from "sonner";

const NAV_ITEMS = [
  { label: "catalog", href: "/catalog" },
  { label: "pricing", href: "/pricing" },
];

export function Navbar({ initialAuth }: { initialAuth?: { isAuthenticated: boolean; userName: string | null } }) {
  const t = useTranslations("nav");
  // T046: detecta prefers-reduced-motion apos mount.
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, setInitialUser } = useAuthStore();

  // Seed store with server-side auth state before first client render
  useEffect(() => {
    if (initialAuth?.isAuthenticated && initialAuth.userName) {
      setInitialUser(initialAuth.userName);
    }
  }, []);

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
          ? "bg-[#09090F]/95 backdrop-blur-md border-[rgba(129,140,248,0.08)]"
          : "bg-[#09090F] border-[rgba(129,140,248,0.06)]"
      }`}
      aria-label={t("mainNav")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between transition-all duration-normal ${scrolled ? "h-14" : "h-16"}`}>
          <motion.div
            className="flex items-center"
            whileHover={reduce ? undefined : { scale: 1.02 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <Link
              href="/"
              className="flex items-center transition-colors"
              aria-label={t("homeAria")}
            >
              <Logo variant="full" size="sm" />
            </Link>
          </motion.div>

          <div className="hidden md:flex items-center space-x-4">
            <SearchCommand />
            <GradientMenu items={NAV_ITEMS.map((item) => ({ label: t(item.label as any) ?? item.label, href: item.href }))} />
            {isAuthenticated ? (
              <div className="relative ml-2">
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#EDE7DC] transition-colors">
                  <span className="w-7 h-7 rounded-full bg-[#818CF8]/20 flex items-center justify-center text-xs font-bold text-[#818CF8]">{user?.name?.[0] ?? "?"}</span>
                  <span>{user?.name?.split(" ")[0] ?? t("profile")}</span>
                </button>
                {menuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md shadow-floating py-1 z-dropdown" onMouseLeave={() => setMenuOpen(false)}>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-[#9CA3AF] hover:bg-[#1C1C2E] hover:text-[#EDE7DC] transition-colors">{t("profile")}</Link>
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-[#9CA3AF] hover:bg-[#1C1C2E] hover:text-[#EDE7DC] transition-colors">{t("dashboard")}</Link>
                    <Link href="/settings" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-[#9CA3AF] hover:bg-[#1C1C2E] hover:text-[#EDE7DC] transition-colors">{t("settings")}</Link>
                    <Link href="/watchlist" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-[#9CA3AF] hover:bg-[#1C1C2E] hover:text-[#EDE7DC] transition-colors">{t("watchlist")}</Link>
                    <hr className="my-1 border-[rgba(129,140,248,0.08)]" />
                    <button onClick={() => { logout(); setMenuOpen(false); toast.success(t("sessionEnded")); router.push("/"); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#1C1C2E] transition-colors">{t("logout")}</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="text-[#9CA3AF] hover:text-[#EDE7DC] px-3 py-2 rounded-md text-sm font-medium transition-colors">{t("login")}</Link>
                <Link href="/register" className="bg-[#818CF8] text-[#0F172A] px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all">{t("register")}</Link>
              </>
            )}
            <LocaleSwitcher />
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={t("openMenu")}
              className="text-[#9CA3AF] hover:text-[#EDE7DC] p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
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
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeInOut" }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-[#09090F] border-t border-[rgba(129,140,248,0.08)]">
              <Link href="/catalog" onClick={() => setMobileOpen(false)} className="block text-[#9CA3AF] hover:text-[#EDE7DC] px-3 py-2 rounded-md text-base font-medium">{t("catalog")}</Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block text-[#9CA3AF] hover:text-[#EDE7DC] px-3 py-2 rounded-md text-base font-medium">{t("pricing")}</Link>
              {isAuthenticated ? (
                <>
                  <Link href="/profile" onClick={() => setMobileOpen(false)} className="block text-[#9CA3AF] hover:text-[#EDE7DC] px-3 py-2 rounded-md text-base font-medium">{t("profile")}</Link>
                  <Link href="/watchlist" onClick={() => setMobileOpen(false)} className="block text-[#9CA3AF] hover:text-[#EDE7DC] px-3 py-2 rounded-md text-base font-medium">{t("watchlist")}</Link>
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="block w-full text-left text-red-400 hover:text-red-300 px-3 py-2 rounded-md text-base font-medium">{t("logout")}</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-[#9CA3AF] hover:text-[#EDE7DC] px-3 py-2 rounded-md text-base font-medium">{t("login")}</Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="block text-[#818CF8] hover:text-[#A5B4FC] font-semibold px-3 py-2 rounded-md text-base">{t("register")}</Link>
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
