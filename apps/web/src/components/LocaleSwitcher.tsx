"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";

const LOCALES = [
  { code: "pt-BR", short: "PT" },
  { code: "en-US", short: "EN" },
  { code: "es-ES", short: "ES" },
] as const;

const SHORT_MAP: Record<string, string> = {
  "pt-BR": "PT",
  "en-US": "EN",
  "es-ES": "ES",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("localeSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function switchLocale(newLocale: string) {
    setOpen(false);
    startTransition(() => {
      const segments = pathname.split("/");
      segments[1] = newLocale;
      router.replace(segments.join("/") || "/");
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#818CF8] hover:bg-[#11111E] rounded-md px-2 py-1 transition-colors"
        aria-label={t("ariaLabel")}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="4" ry="10" />
          <path d="M2 12h20" />
        </svg>
        <span>{SHORT_MAP[locale] ?? locale.toUpperCase()}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-dropdown bg-[#11111E] border border-[#1C1C2E] rounded-md py-1 min-w-[100px] shadow-floating">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                locale === l.code
                  ? "text-[#818CF8] bg-[rgba(129,140,248,0.08)]"
                  : "text-[#9CA3AF] hover:text-[#EDE7DC] hover:bg-[#11111E]"
              }`}
            >
              {l.short}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
