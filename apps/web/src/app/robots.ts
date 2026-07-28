import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://media-rate-web.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/*/login',
        '/*/register',
        '/*/account',
        '/*/admin',
        '/*/plans',
        '/*/api/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
