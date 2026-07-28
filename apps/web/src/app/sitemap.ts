import { MetadataRoute } from 'next';
import { routing } from '../i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://media-rate-web.vercel.app';
  
  // Rotas públicas estáticas (sem slug)
  const staticRoutes = [
    '',
    '/about',
    '/methodology',
    '/sources',
    '/catalog',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const route of staticRoutes) {
    const alternates: Record<string, string> = {};
    
    // Constrói as URLs alternativas para cada locale suportado
    for (const locale of routing.locales) {
      alternates[locale] = `${baseUrl}/${locale}${route}`;
    }
    // Adiciona o x-default apontando para o root (sem locale, que o middleware trata)
    alternates['x-default'] = `${baseUrl}${route}`;

    // Adiciona uma entrada para cada locale explícito
    for (const locale of routing.locales) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' || route === '/catalog' ? 'daily' : 'monthly',
        priority: route === '' ? 1 : 0.8,
        alternates: {
          languages: alternates,
        },
      });
    }
  }

  return sitemapEntries;
}
