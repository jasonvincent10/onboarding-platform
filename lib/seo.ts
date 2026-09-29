import type { Metadata } from 'next'
import { site } from '@/content/site'

/**
 * Builds the metadata for a page, keeping Open Graph and Twitter in step.
 *
 * The reason this exists: Next merges page metadata over the root layout's,
 * and `twitter` does NOT fall back to the same page's `openGraph`. A page that
 * sets only `openGraph` therefore inherits the LAYOUT's twitter title and
 * description, so every sub-page shared on X advertised the home page. Setting
 * both here means a new page cannot reintroduce that bug by omission.
 */
export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: {
  /** Page title, without the site name. The layout template appends that. */
  title: string
  description: string
  /** Canonical path, e.g. "/safe-ai". */
  path: string
  /** Set false for pages that should stay out of search results. */
  index?: boolean
}): Metadata {
  const social = `${title} | ${site.name}`

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: social,
      description,
      url: path,
      type: 'website',
      siteName: site.name,
      locale: 'en_GB',
    },
    twitter: {
      card: 'summary_large_image',
      title: social,
      description,
    },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  }
}
