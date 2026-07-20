"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

const LOCALES = [
  { code: "pt-BR", label: "Português", flag: "🇧🇷" },
  { code: "en-US", label: "English", flag: "🇺🇸" },
  { code: "es-ES", label: "Español", flag: "🇪🇸" },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("common");

  function onSelectChange(newLocale: string) {
    startTransition(() => {
      // Substitui o locale na URL atual.
      const segments = pathname.split("/");
      segments[1] = newLocale;
      router.replace(segments.join("/") || "/");
    });
  }

  return (
    <label className="relative inline-block">
      <span className="sr-only">{t("appName")} — idioma</span>
      <select
        defaultValue={locale}
        onChange={(e) => onSelectChange(e.target.value)}
        disabled={isPending}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md px-2 py-1 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-700"
        aria-label="Selecionar idioma"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </label>
  );
}
