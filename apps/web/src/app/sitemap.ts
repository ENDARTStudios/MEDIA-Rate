import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedAlternates, localizedUrl } from "@/lib/seo";
import { listMediaSlugs } from "@/lib/api";

const publicRoutes: {
  pathname: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}[] = [
  { pathname: "", changeFrequency: "weekly", priority: 1 },
  { pathname: "/catalog", changeFrequency: "weekly", priority: 0.9 },
  { pathname: "/pricing", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/about", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/methodology", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/sources", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/privacy", changeFrequency: "monthly", priority: 0.3 },
  { pathname: "/terms", changeFrequency: "monthly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicRoutes.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, route.pathname),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: localizedAlternates(route.pathname),
      },
    })),
  );

  // T336: entradas dinâmicas do catálogo (uma URL por locale). Falha da API →
  // sitemap segue só com as rotas estáticas (nunca expõe mídia mock).
  const slugs = await listMediaSlugs();
  const media = slugs.flatMap((slug) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, `/media/${slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.5,
      alternates: {
        languages: localizedAlternates(`/media/${slug}`),
      },
    })),
  );

  return [...base, ...media];
}
