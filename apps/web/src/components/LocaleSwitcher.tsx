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

export function LocaleSwitcher({ placement = "bottom" }: { placement?: "bottom" | "top" }) {
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
    // D-591 (T211): a preferência de idioma era gravada pelo middleware
    // (`Set-Cookie: NEXT_LOCALE`), o que impede cache de CDN nas rotas estáticas
    // — e o middleware deixou de gravá-la lá. Como a intenção nasce AQUI (escolha
    // explícita do usuário), gravar no cliente preserva a UX sem custo no servidor.
    try {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // cookie indisponível (modo privado) — segue só com a URL, que já basta.
    }
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
        className="flex items-center gap-1.5 text-xs text-fg-secondary hover:text-accent-indigo hover:bg-surface-card rounded-md px-2 py-1 transition-colors"
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
        <div
          className={`absolute right-0 ${placement === "top" ? "bottom-full mb-1" : "top-full mt-1"} z-dropdown bg-surface-card border border-surface-elevated rounded-md py-1 min-w-[100px] shadow-floating`}
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                locale === l.code
                  ? "text-accent-indigo bg-accent-indigo/10"
                  : "text-fg-secondary hover:text-fg-primary hover:bg-surface-elevated"
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
