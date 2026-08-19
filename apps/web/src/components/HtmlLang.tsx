"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { routing } from "@/i18n/routing";

const LOCALES: readonly string[] = routing.locales;

/**
 * T331: substitui `await headers()` no root layout — aquela chamada forçava
 * renderização dinâmica e desligava ISR/estático em TODAS as rotas.
 *
 * Como `localePrefix: "always"`, o locale é sempre o 1º segmento do path
 * (ex.: /pt-BR/catalog). Este componente lê o path e corrige `<html lang>`
 * no mount (document.documentElement.lang), mantendo a11y/SEO por locale.
 *
 * Trade-off documentado (D-323): o 1º paint usa o locale default (pt-BR) e é
 * corrigido imediatamente após a hidratação — custo mínimo para recuperar ISR.
 */
export function HtmlLang() {
  const pathname = usePathname();
  const segment = pathname.split("/")[1] ?? routing.defaultLocale;
  const locale = LOCALES.includes(segment) ? segment : routing.defaultLocale;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
