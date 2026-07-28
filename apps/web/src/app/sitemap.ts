import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { MOCK_MEDIA } from "@/lib/api";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

const publicRoutes: Array<{
  pathname: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}> = [
  { pathname: "", changeFrequency: "weekly", priority: 1 },
  { pathname: "/catalog", changeFrequency: "weekly", priority: 0.9 },
  { pathname: "/pricing", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/about", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/methodology", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/sources", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/privacy", changeFrequency: "monthly", priority: 0.3 },
  { pathname: "/terms", changeFrequency: "monthly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = publicRoutes.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, route.pathname),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: localizedAlternates(route.pathname),
      },
    })),
  );

  const mediaEntries = MOCK_MEDIA.flatMap((media) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, `/media/${media.slug}`),
      ...(media.score?.updatedAt ? { lastModified: media.score.updatedAt } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: {
        languages: localizedAlternates(`/media/${media.slug}`),
      },
    })),
  );

  return [...staticEntries, ...mediaEntries];
}
