import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://podcast.rebootthefuture.org';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Currently only homepage exists (episodes are shown on main page)
  // If you add individual episode pages in the future, add them here
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
