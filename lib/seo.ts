import type { Metadata } from 'next'

const SITE_NAME = 'Vopria'
const DEFAULT_OG_IMAGE = '/og-image.png'

/**
 * Builds a consistent Metadata object (title, description, canonical,
 * Open Graph, Twitter card) for a single public page. `path` is the
 * page's route (e.g. '/contact') and resolves against metadataBase.
 */
export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string
  description: string
  path: string
  noIndex?: boolean
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
      locale: 'en_GB',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}
