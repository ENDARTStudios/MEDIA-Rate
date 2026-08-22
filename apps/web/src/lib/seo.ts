import { routing } from "@/i18n/routing";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mediarate.app").replace(
  /\/$/,
  "",
);

export function localizedUrl(locale: string, pathname = ""): string {
  const normalizedPath = pathname && !pathname.startsWith("/") ? `/${pathname}` : pathname;
  return `${siteUrl}/${locale}${normalizedPath}`;
}

export function localizedAlternates(pathname = ""): Record<string, string> {
  const alternates: Record<string, string> = {};

  for (const locale of routing.locales) {
    alternates[locale] = localizedUrl(locale, pathname);
  }

  alternates["x-default"] = localizedUrl(routing.defaultLocale, pathname);
  return alternates;
}

export function localeOpenGraph(locale: string): string {
  const openGraphLocales: Record<string, string> = {
    "pt-BR": "pt_BR",
    "en-US": "en_US",
    "es-ES": "es_ES",
  };
  return openGraphLocales[locale] || "pt_BR";
}

/** T406: og:image de marca (fallback para páginas sem imagem própria). */
export const OG_IMAGE_PADRAO = [
  { url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: "MEDIA Rate" },
];
