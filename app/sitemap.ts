import type { MetadataRoute } from 'next'
import { APP_URL } from '@/lib/config'

// Curated on purpose, not a crawl. Add an entry here whenever a new public
// page is added -- anything not listed stays out of the sitemap.
// /privacy is deliberately excluded: it is noindex (see its metadata).
const PUBLIC_ROUTES: {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}[] = [
  { path: '/', priority: 1, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.8, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PUBLIC_ROUTES.map((route) => ({
    url: `${APP_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
