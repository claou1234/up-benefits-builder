import type { MetadataRoute } from 'next';

const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { 'el-GR': `${origin}/`, en: `${origin}/en/` };
  return [
    { url: `${origin}/`, changeFrequency: 'monthly', priority: 1, alternates: { languages } },
    { url: `${origin}/en/`, changeFrequency: 'monthly', priority: 0.8, alternates: { languages } },
  ];
}
