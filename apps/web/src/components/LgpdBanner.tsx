"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";

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
      aria-label={t("banner")}
      aria-describedby="lgpd-banner-desc"
      className="fixed bottom-0 left-0 right-0 bg-black border-t border-surface-border p-4 shadow-modal z-50"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p id="lgpd-banner-desc" className="text-sm text-gray-300 md:flex-1">
          {t("banner")}{" "}
          <Link href="/privacy" className="underline hover:text-accent-500 transition-colors">
            {t("privacy")}
          </Link>
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={reject}>
            {t("reject")}
          </Button>
          <Button size="sm" onClick={accept}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
