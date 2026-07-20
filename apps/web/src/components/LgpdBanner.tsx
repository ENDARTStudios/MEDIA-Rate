"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "lgpd-consent-v1";

export function LgpdBanner() {
  const t = useTranslations("lgpd");
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="lgpd-banner-title"
      aria-describedby="lgpd-banner-desc"
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <p id="lgpd-banner-desc" className="text-sm md:flex-1">
          {t("banner")}{" "}
          <Link href="/privacy" className="underline hover:text-primary-100">
            {t("privacy")}
          </Link>
        </p>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={reject}
            className="px-4 py-2 text-sm rounded-md border border-gray-600 hover:bg-gray-800"
          >
            {t("reject")}
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 text-sm rounded-md bg-primary-700 hover:bg-primary-800"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
