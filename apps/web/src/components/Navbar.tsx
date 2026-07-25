"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { LazyLogo } from "./lazy";

export function Navbar() {
  const t = useTranslations("nav");
  const shouldReduce = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="bg-black border-b border-surface-border"
      aria-label="Navegação principal"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
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
            <Link
              href="/catalog"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {t("catalog")}
            </Link>
            <Link
              href="/pricing"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {t("pricing")}
            </Link>
            <Link
              href="/login"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {t("login")}
            </Link>
            <Link
              href="/register"
              className="bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-400"
            >
              {t("register")}
            </Link>
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
              <Link href="/catalog" onClick={() => setMobileOpen(false)} className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">
                {t("catalog")}
              </Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">
                {t("pricing")}
              </Link>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">
                {t("login")}
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="block text-accent-600 hover:text-accent-500 font-semibold px-3 py-2 rounded-md text-base">
                {t("register")}
              </Link>
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
