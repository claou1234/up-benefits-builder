import type { MetadataRoute } from 'next';

const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  const indexable = process.env.NEXT_PUBLIC_ALLOW_INDEXING === '1';
  return {
    rules: indexable ? { userAgent: '*', allow: '/', disallow: '/api/' } : { userAgent: '*', disallow: '/' },
    sitemap: `${origin}/sitemap.xml`,
  };
}
