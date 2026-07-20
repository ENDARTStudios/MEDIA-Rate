"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function Navbar() {
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
      aria-label="Navegação principal"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-bold text-primary-700 dark:text-primary-100"
              aria-label="MEDIA Rate — página inicial"
            >
              MEDIA Rate
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/catalog"
              className="text-gray-700 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-100 px-3 py-2 rounded-md text-sm font-medium"
            >
              {t("catalog")}
            </Link>
            <Link
              href="/pricing"
              className="text-gray-700 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-100 px-3 py-2 rounded-md text-sm font-medium"
            >
              {t("pricing")}
            </Link>
            <Link
              href="/login"
              className="text-gray-700 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-100 px-3 py-2 rounded-md text-sm font-medium"
            >
              {t("login")}
            </Link>
            <Link
              href="/register"
              className="bg-primary-700 text-white hover:bg-primary-800 px-4 py-2 rounded-md text-sm font-medium"
            >
              {t("register")}
            </Link>
            <LocaleSwitcher />
          </div>

          {/* Mobile button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label="Abrir menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/catalog"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileOpen(false)}
            >
              {t("catalog")}
            </Link>
            <Link
              href="/pricing"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileOpen(false)}
            >
              {t("pricing")}
            </Link>
            <Link
              href="/login"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileOpen(false)}
            >
              {t("login")}
            </Link>
            <Link
              href="/register"
              className="block px-3 py-2 rounded-md text-base font-medium bg-primary-700 text-white"
              onClick={() => setMobileOpen(false)}
            >
              {t("register")}
            </Link>
            <div className="px-3 py-2">
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
